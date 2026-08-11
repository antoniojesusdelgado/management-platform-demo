alter table public.profiles
  add column if not exists active_organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists onboarding_completed_at timestamptz;

create index if not exists profiles_active_organization_idx
  on public.profiles (active_organization_id)
  where active_organization_id is not null;

create table if not exists public.organization_onboarding (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  current_step text not null default 'company' check (current_step in ('company','people','suite','review','completed')),
  template_mode text not null default 'empty' check (template_mode in ('empty','synthetic')),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_directory_settings (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('google_workspace','microsoft_365')),
  status text not null default 'not_configured' check (status in ('not_configured','ready','syncing','error','paused')),
  sync_interval_minutes integer not null default 60 check (sync_interval_minutes between 60 and 10080),
  team_mapping jsonb not null default '{}'::jsonb check (jsonb_typeof(team_mapping) = 'object'),
  last_synced_at timestamptz,
  last_error_code text,
  updated_at timestamptz not null default now(),
  primary key (organization_id, provider)
);

create table if not exists public.directory_identity_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid references public.people(id) on delete restrict,
  provider text not null check (provider in ('google_workspace','microsoft_365')),
  external_id text not null check (char_length(external_id) between 1 and 240),
  primary_email text not null check (primary_email = lower(primary_email) and char_length(primary_email) between 3 and 254),
  display_name text not null check (char_length(display_name) between 2 and 160),
  external_team text,
  status text not null default 'active' check (status in ('active','suspended','deleted')),
  external_version text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, external_id)
);

create index if not exists directory_identity_links_org_status_idx
  on public.directory_identity_links (organization_id, provider, status);
create index if not exists directory_identity_links_person_idx
  on public.directory_identity_links (person_id)
  where person_id is not null;

create table if not exists public.directory_sync_cursors (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('google_workspace','microsoft_365')),
  cursor_value text,
  full_sync_completed boolean not null default false,
  last_synced_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (organization_id, provider)
);

create table if not exists public.directory_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('google_workspace','microsoft_365')),
  trigger_kind text not null check (trigger_kind in ('scheduled','manual','initial')),
  status text not null default 'pending' check (status in ('pending','running','succeeded','partial','failed')),
  idempotency_key text not null,
  processed_count integer not null default 0 check (processed_count >= 0),
  created_count integer not null default 0 check (created_count >= 0),
  updated_count integer not null default 0 check (updated_count >= 0),
  deactivated_count integer not null default 0 check (deactivated_count >= 0),
  error_code text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, provider, idempotency_key)
);

create index if not exists directory_sync_jobs_org_created_idx
  on public.directory_sync_jobs (organization_id, created_at desc);

create or replace function private.initialize_directory_settings_v1_8()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.organization_directory_settings (organization_id, provider)
  values (new.id, 'google_workspace'), (new.id, 'microsoft_365')
  on conflict (organization_id, provider) do nothing;
  return new;
end;
$$;
revoke all on function private.initialize_directory_settings_v1_8() from public, anon, authenticated;
drop trigger if exists initialize_directory_settings_v1_8 on public.organizations;
create trigger initialize_directory_settings_v1_8
after insert on public.organizations
for each row execute function private.initialize_directory_settings_v1_8();

alter table public.organization_onboarding enable row level security;
alter table public.organization_directory_settings enable row level security;
alter table public.directory_identity_links enable row level security;
alter table public.directory_sync_cursors enable row level security;
alter table public.directory_sync_jobs enable row level security;

create policy organization_onboarding_member_select on public.organization_onboarding
  for select to authenticated using (private.is_org_member(organization_id));
create policy organization_onboarding_admin_manage on public.organization_onboarding
  for all to authenticated
  using (private.has_permission(organization_id, 'settings.workspace.manage'))
  with check (private.has_permission(organization_id, 'settings.workspace.manage'));

create policy organization_directory_settings_member_select on public.organization_directory_settings
  for select to authenticated using (private.is_org_member(organization_id));
create policy organization_directory_settings_admin_manage on public.organization_directory_settings
  for all to authenticated
  using (private.has_permission(organization_id, 'settings.workspace.manage'))
  with check (private.has_permission(organization_id, 'settings.workspace.manage'));

create policy directory_identity_links_member_select on public.directory_identity_links
  for select to authenticated using (private.is_org_member(organization_id));
create policy directory_identity_links_admin_manage on public.directory_identity_links
  for all to authenticated
  using (private.has_permission(organization_id, 'settings.workspace.manage'))
  with check (private.has_permission(organization_id, 'settings.workspace.manage'));

create policy directory_sync_cursors_admin_select on public.directory_sync_cursors
  for select to authenticated using (private.has_permission(organization_id, 'settings.workspace.manage'));
create policy directory_sync_jobs_admin_select on public.directory_sync_jobs
  for select to authenticated using (private.has_permission(organization_id, 'settings.workspace.manage'));

grant select, insert, update on public.organization_onboarding to authenticated;
grant select, insert, update on public.organization_directory_settings to authenticated;
grant select on public.directory_identity_links, public.directory_sync_cursors, public.directory_sync_jobs to authenticated;

create or replace function private.provision_organization_v1_8(
  target_profile_id uuid,
  target_name text,
  target_slug text,
  target_template_mode text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  new_organization_id uuid := gen_random_uuid();
  new_role_id uuid := gen_random_uuid();
begin
  if (select auth.uid()) is null or (select auth.uid()) <> target_profile_id then
    raise exception 'authentication required';
  end if;
  if char_length(trim(target_name)) not between 2 and 100
     or target_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or target_template_mode not in ('empty','synthetic') then
    raise exception 'invalid organization input';
  end if;

  insert into public.organizations (id, name, slug)
  values (new_organization_id, trim(target_name), target_slug);

  insert into public.roles (id, organization_id, code, name, color, is_system)
  values (new_role_id, new_organization_id, 'admin', 'Administración', '#2563eb', true);
  insert into public.role_permissions (role_id, permission_id)
  select new_role_id, id from public.permissions;
  insert into public.memberships (organization_id, profile_id, role_id, status, joined_at)
  values (new_organization_id, target_profile_id, new_role_id, 'active', now());
  insert into public.organization_settings (organization_id) values (new_organization_id)
  on conflict (organization_id) do nothing;
  insert into public.module_settings (organization_id, module_id, enabled, sort_order)
  select new_organization_id, module_id, true, sort_order
  from (values
    ('inicio',0),('vacaciones',1),('analitica',2),('proyectos',3),('tareas',4),
    ('incidencias',5),('tesoreria',6),('nominas',7),('personal',8),
    ('operaciones',9),('novedades',10),('configuracion',11)
  ) as module_seed(module_id, sort_order)
  on conflict (organization_id, module_id) do nothing;

  insert into public.organization_onboarding (organization_id, status, current_step, template_mode)
  values (new_organization_id, 'in_progress', 'people', target_template_mode);
  insert into public.organization_directory_settings (organization_id, provider)
  values (new_organization_id, 'google_workspace'), (new_organization_id, 'microsoft_365')
  on conflict (organization_id, provider) do nothing;
  insert into public.changelog_entries (
    organization_id, version, title, summary, status, published_at, created_by
  ) values (
    new_organization_id, '1.8.0', 'Tu empresa, preparada para crecer',
    'Un nuevo inicio, acceso con Google o Microsoft, varias empresas y sincronización corporativa facilitan la puesta en marcha de cada equipo.',
    'published', now(), target_profile_id
  );
  update public.profiles set active_organization_id = new_organization_id, updated_at = now()
  where id = target_profile_id;
  insert into public.audit_events (organization_id, actor_profile_id, event_type, entity_type, entity_id, metadata)
  values (new_organization_id, target_profile_id, 'organization.created', 'organization', new_organization_id,
    jsonb_build_object('template_mode', target_template_mode));
  return new_organization_id;
end;
$$;

revoke all on function private.provision_organization_v1_8(uuid,text,text,text) from public, anon, authenticated;

create or replace function public.create_organization_v1_8(
  target_name text,
  target_slug text,
  target_template_mode text default 'empty'
) returns uuid
language sql security definer set search_path = '' as $$
  select private.provision_organization_v1_8((select auth.uid()), target_name, target_slug, target_template_mode);
$$;
revoke all on function public.create_organization_v1_8(text,text,text) from public, anon;
grant execute on function public.create_organization_v1_8(text,text,text) to authenticated;

create or replace function public.switch_active_organization_v1_8(target_organization_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if (select auth.uid()) is null or not private.is_org_member(target_organization_id) then
    raise exception 'permission denied';
  end if;
  update public.profiles set active_organization_id = target_organization_id, updated_at = now()
  where id = (select auth.uid());
end;
$$;
revoke all on function public.switch_active_organization_v1_8(uuid) from public, anon;
grant execute on function public.switch_active_organization_v1_8(uuid) to authenticated;

create or replace function public.complete_organization_onboarding_v1_8(target_organization_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not private.has_permission(target_organization_id, 'settings.workspace.manage') then
    raise exception 'permission denied';
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

create or replace function public.accept_organization_invitation_v1_8(invitation_token text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  invitation_record record;
  current_email text;
begin
  select lower(email) into current_email from auth.users where id = (select auth.uid());
  if current_email is null or char_length(invitation_token) < 16 then raise exception 'invalid invitation'; end if;
  select * into invitation_record from public.invitations
  where token_hash = encode(extensions.digest(invitation_token, 'sha256'), 'hex')
    and accepted_at is null and revoked_at is null and expires_at > now()
  for update;
  if invitation_record.id is null or invitation_record.email <> current_email then raise exception 'invalid invitation'; end if;
  insert into public.memberships (organization_id, profile_id, role_id, status, joined_at)
  values (invitation_record.organization_id, (select auth.uid()), invitation_record.role_id, 'active', now())
  on conflict (organization_id, profile_id) do update
    set role_id = excluded.role_id, status = 'active', joined_at = coalesce(public.memberships.joined_at, now()), updated_at = now();
  update public.invitations set accepted_at = now() where id = invitation_record.id;
  update public.profiles set active_organization_id = invitation_record.organization_id, updated_at = now()
  where id = (select auth.uid());
  return invitation_record.organization_id;
end;
$$;
revoke all on function public.accept_organization_invitation_v1_8(text) from public, anon;
grant execute on function public.accept_organization_invitation_v1_8(text) to authenticated;

create or replace function private.apply_directory_sync_batch_v1_8(
  target_organization_id uuid,
  target_provider text,
  target_users jsonb,
  target_cursor text,
  target_full_sync_completed boolean,
  target_trigger text,
  target_idempotency_key text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  job_id uuid := gen_random_uuid();
  entry jsonb;
  linked_person_id uuid;
  mapped_team text;
  new_status public.person_status;
  created_total integer := 0;
  updated_total integer := 0;
  deactivated_total integer := 0;
begin
  if (select auth.role()) <> 'service_role'
     and not private.has_permission(target_organization_id, 'settings.workspace.manage') then
    raise exception 'permission denied';
  end if;
  if target_provider not in ('google_workspace','microsoft_365')
     or target_trigger not in ('scheduled','manual','initial')
     or jsonb_typeof(target_users) <> 'array'
     or jsonb_array_length(target_users) > 250 then
    raise exception 'invalid directory batch';
  end if;

  insert into public.directory_sync_jobs (
    id, organization_id, provider, trigger_kind, status, idempotency_key, started_at
  ) values (
    job_id, target_organization_id, target_provider, target_trigger, 'running', target_idempotency_key, now()
  ) on conflict (organization_id, provider, idempotency_key) do update
    set status = case when public.directory_sync_jobs.status = 'succeeded' then 'succeeded' else 'running' end
  returning id into job_id;

  for entry in select value from jsonb_array_elements(target_users)
  loop
    if coalesce(entry->>'externalId','') = ''
       or coalesce(entry->>'primaryEmail','') !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
       or char_length(coalesce(entry->>'displayName','')) not between 2 and 160 then
      continue;
    end if;
    select link.person_id into linked_person_id
    from public.directory_identity_links link
    where link.organization_id = target_organization_id
      and link.provider = target_provider
      and link.external_id = entry->>'externalId';

    mapped_team := coalesce(
      (select settings.team_mapping ->> coalesce(entry->>'externalTeam','')
       from public.organization_directory_settings settings
       where settings.organization_id = target_organization_id
         and settings.provider = target_provider),
      nullif(left(entry->>'externalTeam', 100), ''),
      'Sin equipo'
    );
    new_status := case when entry->>'status' = 'active' then 'active'::public.person_status else 'inactive'::public.person_status end;

    if linked_person_id is null then
      insert into public.people (organization_id, display_name, team, position_title, status, role_code)
      values (target_organization_id, left(entry->>'displayName',100), mapped_team, 'Perfil sincronizado', new_status, 'collaborator')
      returning id into linked_person_id;
      created_total := created_total + 1;
    else
      update public.people set
        display_name = left(entry->>'displayName',100),
        team = mapped_team,
        status = new_status,
        updated_at = now()
      where id = linked_person_id and organization_id = target_organization_id;
      updated_total := updated_total + 1;
      if new_status = 'inactive' then deactivated_total := deactivated_total + 1; end if;
    end if;

    insert into public.directory_identity_links (
      organization_id, person_id, provider, external_id, primary_email,
      display_name, external_team, status, external_version, last_seen_at, updated_at
    ) values (
      target_organization_id, linked_person_id, target_provider, entry->>'externalId',
      lower(entry->>'primaryEmail'), entry->>'displayName', nullif(entry->>'externalTeam',''),
      entry->>'status', nullif(entry->>'externalVersion',''), now(), now()
    ) on conflict (organization_id, provider, external_id) do update set
      person_id = excluded.person_id,
      primary_email = excluded.primary_email,
      display_name = excluded.display_name,
      external_team = excluded.external_team,
      status = excluded.status,
      external_version = excluded.external_version,
      last_seen_at = now(),
      updated_at = now();
  end loop;

  insert into public.directory_sync_cursors (
    organization_id, provider, cursor_value, full_sync_completed, last_synced_at, updated_at
  ) values (
    target_organization_id, target_provider, target_cursor, target_full_sync_completed, now(), now()
  ) on conflict (organization_id, provider) do update set
    cursor_value = excluded.cursor_value,
    full_sync_completed = public.directory_sync_cursors.full_sync_completed or excluded.full_sync_completed,
    last_synced_at = now(), updated_at = now();

  update public.organization_directory_settings set
    provider = target_provider, status = 'ready', last_synced_at = now(), last_error_code = null, updated_at = now()
  where organization_id = target_organization_id and provider = target_provider;
  update public.directory_sync_jobs set
    status = 'succeeded', processed_count = jsonb_array_length(target_users),
    created_count = created_total, updated_count = updated_total,
    deactivated_count = deactivated_total, finished_at = now()
  where id = job_id;
  insert into public.audit_events (organization_id, actor_profile_id, event_type, entity_type, entity_id, metadata)
  values (target_organization_id, (select auth.uid()), 'directory.sync.completed', 'directory_sync_job', job_id,
    jsonb_build_object('provider', target_provider, 'processed', jsonb_array_length(target_users), 'trigger', target_trigger));
  return job_id;
end;
$$;
revoke all on function private.apply_directory_sync_batch_v1_8(uuid,text,jsonb,text,boolean,text,text) from public, anon, authenticated;
revoke all on function private.apply_directory_sync_batch_v1_8(uuid,text,jsonb,text,boolean,text,text) from service_role;

create or replace function public.apply_directory_sync_batch_v1_8(
  target_organization_id uuid,
  target_provider text,
  target_users jsonb,
  target_cursor text,
  target_full_sync_completed boolean,
  target_trigger text,
  target_idempotency_key text
) returns uuid language sql security definer set search_path = '' as $$
  select private.apply_directory_sync_batch_v1_8(
    target_organization_id, target_provider, target_users, target_cursor,
    target_full_sync_completed, target_trigger, target_idempotency_key
  )
  where (select auth.uid()) is not null or (select auth.role()) = 'service_role';
$$;
revoke all on function public.apply_directory_sync_batch_v1_8(uuid,text,jsonb,text,boolean,text,text) from public, anon;
grant execute on function public.apply_directory_sync_batch_v1_8(uuid,text,jsonb,text,boolean,text,text) to authenticated, service_role;

create or replace function public.refresh_directory_connection_secret_v1_8(
  target_connection_id uuid,
  target_access_token text,
  target_refresh_token text,
  target_expires_at timestamptz
) returns void language plpgsql security definer set search_path = '' as $$
declare
  target_secret_id uuid;
begin
  if (select auth.role()) <> 'service_role' then raise exception 'permission denied'; end if;
  if char_length(target_access_token) < 8 then raise exception 'invalid token'; end if;
  select token_secret_id into target_secret_id
  from public.workspace_connections where id = target_connection_id and status = 'connected';
  if target_secret_id is null then raise exception 'connection not found'; end if;
  perform vault.update_secret(
    target_secret_id,
    jsonb_build_object(
      'access_token', target_access_token,
      'refresh_token', nullif(target_refresh_token, ''),
      'expires_at', target_expires_at
    )::text
  );
  update public.workspace_connections
  set token_expires_at = target_expires_at, updated_at = now()
  where id = target_connection_id;
end;
$$;
revoke all on function public.refresh_directory_connection_secret_v1_8(uuid,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.refresh_directory_connection_secret_v1_8(uuid,text,text,timestamptz) to service_role;

insert into public.organization_onboarding (organization_id, status, current_step, template_mode, completed_at)
select id, 'completed', 'completed', 'synthetic', now() from public.organizations
on conflict (organization_id) do nothing;
insert into public.organization_directory_settings (organization_id, provider)
select organization.id, provider_seed.provider
from public.organizations organization
cross join (values ('google_workspace'), ('microsoft_365')) provider_seed(provider)
on conflict (organization_id, provider) do nothing;
insert into public.changelog_entries (
  organization_id, version, title, summary, status, published_at, created_by
)
select organization.id, '1.8.0', 'Tu empresa, preparada para crecer',
  'Un nuevo inicio, acceso con Google o Microsoft, varias empresas y sincronización corporativa facilitan la puesta en marcha de cada equipo.',
  'published', now(), creator.profile_id
from public.organizations organization
cross join lateral (
  select membership.profile_id
  from public.memberships membership
  where membership.organization_id = organization.id and membership.status = 'active'
  order by membership.created_at
  limit 1
) creator
on conflict (organization_id, version) do nothing;
update public.profiles profile set
  active_organization_id = coalesce(
    profile.active_organization_id,
    (
      select membership.organization_id
      from public.memberships membership
      where membership.profile_id = profile.id and membership.status = 'active'
      order by membership.created_at
      limit 1
    )
  ),
  onboarding_completed_at = coalesce(profile.onboarding_completed_at, now())
where exists (
  select 1 from public.memberships membership
  where membership.profile_id = profile.id and membership.status = 'active'
);

comment on table public.directory_identity_links is 'Read-only directory identities synchronized from Google Workspace or Microsoft 365; operational fields remain local.';
comment on function public.create_organization_v1_8(text,text,text) is 'Creates an isolated organization for the authenticated profile without overwriting existing workspaces.';
