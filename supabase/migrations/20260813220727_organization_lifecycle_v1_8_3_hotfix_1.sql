create table if not exists private.platform_administrators (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by text not null check (char_length(granted_by) between 3 and 120)
);

create table if not exists private.organization_deletion_audit (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  organization_name text not null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

revoke all on table private.platform_administrators from public, anon, authenticated;
revoke all on table private.organization_deletion_audit from public, anon, authenticated;

create or replace function public.assign_platform_administrator_v1_8_3_hotfix_1(
  target_profile_id uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'permission denied';
  end if;
  if not exists (select 1 from public.profiles where id = target_profile_id) then
    raise exception 'profile not found';
  end if;

  insert into private.platform_administrators (profile_id, granted_by)
  values (target_profile_id, current_user)
  on conflict (profile_id) do nothing;

  update public.memberships membership
  set role_id = administrator_role.id,
      status = 'active',
      joined_at = coalesce(membership.joined_at, now()),
      updated_at = now()
  from public.roles administrator_role
  where membership.profile_id = target_profile_id
    and administrator_role.organization_id = membership.organization_id
    and administrator_role.code = 'admin';

  update public.people
  set role_code = 'admin'::public.person_role_code,
      status = 'active'::public.person_status,
      updated_at = now()
  where profile_id = target_profile_id;
end;
$$;

revoke all on function public.assign_platform_administrator_v1_8_3_hotfix_1(uuid) from public, anon, authenticated;
grant execute on function public.assign_platform_administrator_v1_8_3_hotfix_1(uuid) to service_role;

create or replace function private.is_platform_administrator(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_profile_id is not null
    and exists (
      select 1
      from private.platform_administrators administrator
      where administrator.profile_id = target_profile_id
    );
$$;

revoke all on function private.is_platform_administrator(uuid) from public, anon, authenticated;

create or replace function public.is_platform_administrator_v1_8_3_hotfix_1()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_administrator((select auth.uid()));
$$;

revoke all on function public.is_platform_administrator_v1_8_3_hotfix_1() from public, anon;
grant execute on function public.is_platform_administrator_v1_8_3_hotfix_1() to authenticated;

create or replace function public.complete_founder_profile_v1_8_3_hotfix_1(
  target_organization_id uuid,
  target_display_name text,
  target_team text,
  target_position_title text,
  target_contract_type text,
  target_start_date date
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := (select auth.uid());
begin
  if current_profile_id is null
     or not private.has_permission(target_organization_id, 'settings.workspace.manage') then
    raise exception 'permission denied';
  end if;

  if char_length(trim(target_display_name)) not between 2 and 100
     or char_length(trim(target_team)) not between 2 and 100
     or char_length(trim(target_position_title)) not between 2 and 120
     or target_contract_type not in (
       'indefinite_ordinary',
       'permanent_discontinuous',
       'temporary_production',
       'temporary_substitution'
     )
     or target_start_date is null
     or target_start_date > current_date + 1 then
    raise exception 'invalid founder profile input';
  end if;

  insert into public.people (
    organization_id,
    profile_id,
    display_name,
    team,
    position_title,
    status,
    role_code,
    employment_contract_type,
    employment_start_date,
    employment_end_date
  ) values (
    target_organization_id,
    current_profile_id,
    trim(target_display_name),
    trim(target_team),
    trim(target_position_title),
    'active'::public.person_status,
    'admin'::public.person_role_code,
    target_contract_type,
    target_start_date,
    null
  )
  on conflict (organization_id, profile_id) where profile_id is not null
  do update set
    display_name = excluded.display_name,
    team = excluded.team,
    position_title = excluded.position_title,
    status = 'active'::public.person_status,
    role_code = 'admin'::public.person_role_code,
    employment_contract_type = excluded.employment_contract_type,
    employment_start_date = excluded.employment_start_date,
    employment_end_date = null,
    updated_at = now();

  update public.profiles
  set display_name = trim(target_display_name),
      alias = coalesce(alias, trim(target_display_name)),
      updated_at = now()
  where id = current_profile_id;

  update public.organization_onboarding
  set current_step = 'suite', updated_at = now()
  where organization_id = target_organization_id
    and status = 'in_progress';

  insert into public.audit_events (
    organization_id,
    actor_profile_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  select
    target_organization_id,
    current_profile_id,
    'organization.founder_profile_completed',
    'person',
    person.id,
    jsonb_build_object('team', trim(target_team))
  from public.people person
  where person.organization_id = target_organization_id
    and person.profile_id = current_profile_id;
end;
$$;

revoke all on function public.complete_founder_profile_v1_8_3_hotfix_1(uuid,text,text,text,text,date) from public, anon;
grant execute on function public.complete_founder_profile_v1_8_3_hotfix_1(uuid,text,text,text,text,date) to authenticated;

create or replace function public.delete_organization_v1_8_3_hotfix_1(
  target_organization_id uuid,
  confirmation_name text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := (select auth.uid());
  organization_record record;
  next_organization_id uuid;
  deletion_metadata jsonb;
begin
  if current_profile_id is null
     or not private.is_platform_administrator(current_profile_id) then
    raise exception 'permission denied';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_organization_id::text, 0));

  select id, name into organization_record
  from public.organizations
  where id = target_organization_id
  for update;

  if organization_record.id is null then
    raise exception 'organization not found';
  end if;

  if trim(confirmation_name) <> organization_record.name then
    raise exception 'confirmation does not match';
  end if;

  if not exists (
    select 1 from public.memberships membership
    where membership.organization_id = target_organization_id
      and membership.profile_id = current_profile_id
      and membership.status = 'active'
  ) then
    raise exception 'organization membership required';
  end if;

  select jsonb_build_object(
    'memberships', (select count(*) from public.memberships where organization_id = target_organization_id),
    'people', (select count(*) from public.people where organization_id = target_organization_id),
    'projects', (select count(*) from public.projects where organization_id = target_organization_id),
    'tasks', (select count(*) from public.tasks where organization_id = target_organization_id)
  ) into deletion_metadata;

  insert into private.organization_deletion_audit (
    organization_id,
    organization_name,
    actor_profile_id,
    metadata
  ) values (
    target_organization_id,
    organization_record.name,
    current_profile_id,
    deletion_metadata
  );

  delete from public.organizations where id = target_organization_id;

  select membership.organization_id into next_organization_id
  from public.memberships membership
  where membership.profile_id = current_profile_id
    and membership.status = 'active'
  order by membership.created_at, membership.organization_id
  limit 1;

  update public.profiles
  set active_organization_id = next_organization_id,
      updated_at = now()
  where id = current_profile_id;

  return next_organization_id;
end;
$$;

revoke all on function public.delete_organization_v1_8_3_hotfix_1(uuid,text) from public, anon;
grant execute on function public.delete_organization_v1_8_3_hotfix_1(uuid,text) to authenticated;

create or replace function public.complete_organization_onboarding_v1_8(target_organization_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.has_permission(target_organization_id, 'settings.workspace.manage') then
    raise exception 'permission denied';
  end if;
  if not exists (
    select 1
    from public.people person
    where person.organization_id = target_organization_id
      and person.profile_id = (select auth.uid())
  ) then
    raise exception 'founder profile required';
  end if;
  update public.organization_onboarding
  set status = 'completed', current_step = 'completed', completed_at = now(), updated_at = now()
  where organization_id = target_organization_id;
  update public.profiles set onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where id = (select auth.uid());
end;
$$;

revoke all on function public.complete_organization_onboarding_v1_8(uuid) from public, anon;
grant execute on function public.complete_organization_onboarding_v1_8(uuid) to authenticated;
