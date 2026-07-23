create type public.changelog_status as enum ('draft', 'in_review', 'published');

alter table public.changelog_entries
  add column status public.changelog_status not null default 'draft',
  add column updated_at timestamptz not null default now();
update public.changelog_entries
set status = case when published_at is null then 'draft' else 'published' end::public.changelog_status;

create table public.changelog_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entry_id uuid not null references public.changelog_entries(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  from_status public.changelog_status,
  to_status public.changelog_status not null,
  note text not null check (char_length(note) between 3 and 1000),
  created_at timestamptz not null default now()
);

create index changelog_org_status_idx on public.changelog_entries (organization_id, status, updated_at desc);
create index changelog_events_org_entry_idx on public.changelog_events (organization_id, entry_id, created_at desc);

insert into public.permissions (code, description)
values ('changelog.entries.manage', 'Crear, revisar y publicar novedades')
on conflict (code) do nothing;

create or replace function private.record_changelog_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.changelog_events (
    organization_id, entry_id, actor_profile_id, from_status, to_status, note
  ) values (
    new.organization_id, new.id, auth.uid(), null, new.status, 'Borrador creado.'
  );
  return new;
end;
$$;
revoke all on function private.record_changelog_created() from public, anon, authenticated;
create trigger changelog_created_event
after insert on public.changelog_entries
for each row execute function private.record_changelog_created();

create or replace function public.transition_changelog_entry(
  target_entry_id uuid,
  target_status public.changelog_status,
  transition_note text,
  expected_organization_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare current_entry public.changelog_entries%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_permission(expected_organization_id, 'changelog.entries.manage') then
    raise exception 'permission denied';
  end if;
  if char_length(trim(transition_note)) < 3 then raise exception 'transition note required'; end if;
  select * into current_entry from public.changelog_entries
  where id = target_entry_id and organization_id = expected_organization_id for update;
  if not found then raise exception 'changelog entry not found'; end if;
  if not (
    (current_entry.status = 'draft' and target_status = 'in_review') or
    (current_entry.status = 'in_review' and target_status in ('draft', 'published'))
  ) then raise exception 'invalid changelog transition'; end if;

  update public.changelog_entries
  set status = target_status,
      published_at = case when target_status = 'published' then now() else published_at end,
      updated_at = now()
  where id = current_entry.id;
  insert into public.changelog_events (
    organization_id, entry_id, actor_profile_id, from_status, to_status, note
  ) values (
    current_entry.organization_id, current_entry.id, auth.uid(), current_entry.status,
    target_status, trim(transition_note)
  );
  insert into public.audit_events (
    organization_id, actor_profile_id, event_type, entity_type, entity_id, metadata
  ) values (
    current_entry.organization_id, auth.uid(), 'changelog.transitioned', 'changelog_entry',
    current_entry.id, jsonb_build_object('from', current_entry.status, 'to', target_status)
  );
end;
$$;
revoke all on function public.transition_changelog_entry(uuid, public.changelog_status, text, uuid) from public, anon;
grant execute on function public.transition_changelog_entry(uuid, public.changelog_status, text, uuid) to authenticated;

create or replace function public.update_role_permissions(
  target_role_id uuid,
  target_permission_codes text[],
  expected_organization_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare target_role public.roles%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_permission(expected_organization_id, 'settings.workspace.manage') then
    raise exception 'permission denied';
  end if;
  select * into target_role from public.roles
  where id = target_role_id and organization_id = expected_organization_id for update;
  if not found then raise exception 'role not found'; end if;
  if target_role.is_system then raise exception 'system role permissions are immutable'; end if;
  if exists (
    select 1 from unnest(target_permission_codes) code
    where not exists (select 1 from public.permissions permission where permission.code = code)
  ) then raise exception 'unknown permission'; end if;

  delete from public.role_permissions where role_id = target_role.id;
  insert into public.role_permissions (role_id, permission_id)
  select target_role.id, permission.id from public.permissions permission
  where permission.code = any(target_permission_codes)
  on conflict do nothing;
  insert into public.audit_events (
    organization_id, actor_profile_id, event_type, entity_type, entity_id, metadata
  ) values (
    target_role.organization_id, auth.uid(), 'role.permissions_updated', 'role', target_role.id,
    jsonb_build_object('permission_count', cardinality(target_permission_codes))
  );
end;
$$;
revoke all on function public.update_role_permissions(uuid, text[], uuid) from public, anon;
grant execute on function public.update_role_permissions(uuid, text[], uuid) to authenticated;

create or replace function public.update_membership_access(
  target_membership_id uuid,
  target_role_id uuid,
  target_status public.membership_status,
  expected_organization_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare current_membership public.memberships%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_permission(expected_organization_id, 'settings.workspace.manage') then
    raise exception 'permission denied';
  end if;
  select * into current_membership from public.memberships
  where id = target_membership_id and organization_id = expected_organization_id for update;
  if not found then raise exception 'membership not found'; end if;
  if current_membership.profile_id = auth.uid() then raise exception 'self access changes are not allowed'; end if;
  if not exists (
    select 1 from public.roles role
    where role.id = target_role_id and role.organization_id = expected_organization_id
  ) then raise exception 'role not found'; end if;

  update public.memberships
  set role_id = target_role_id,
      status = target_status,
      joined_at = case when target_status = 'active' and joined_at is null then now() else joined_at end,
      updated_at = now()
  where id = current_membership.id;
  insert into public.audit_events (
    organization_id, actor_profile_id, event_type, entity_type, entity_id, metadata
  ) values (
    current_membership.organization_id, auth.uid(), 'membership.access_updated', 'membership',
    current_membership.id, jsonb_build_object('status', target_status, 'role_id', target_role_id)
  );
end;
$$;
revoke all on function public.update_membership_access(uuid, uuid, public.membership_status, uuid) from public, anon;
grant execute on function public.update_membership_access(uuid, uuid, public.membership_status, uuid) to authenticated;

create or replace function public.update_module_setting(
  target_module_id text,
  target_enabled boolean,
  target_sort_order integer,
  expected_organization_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare current_sort_order smallint;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_permission(expected_organization_id, 'settings.workspace.manage') then
    raise exception 'permission denied';
  end if;
  if target_sort_order < 0 or target_sort_order > 8 then raise exception 'invalid module order'; end if;
  if target_module_id = 'inicio' and not target_enabled then raise exception 'home module cannot be disabled'; end if;

  select sort_order into current_sort_order from public.module_settings
  where organization_id = expected_organization_id and module_id = target_module_id for update;
  if found and current_sort_order < target_sort_order then
    update public.module_settings set sort_order = sort_order - 1, updated_at = now()
    where organization_id = expected_organization_id
      and module_id <> target_module_id
      and sort_order > current_sort_order and sort_order <= target_sort_order;
  elsif found and current_sort_order > target_sort_order then
    update public.module_settings set sort_order = sort_order + 1, updated_at = now()
    where organization_id = expected_organization_id
      and module_id <> target_module_id
      and sort_order >= target_sort_order and sort_order < current_sort_order;
  end if;

  insert into public.module_settings (organization_id, module_id, enabled, sort_order, updated_at)
  values (expected_organization_id, target_module_id, target_enabled, target_sort_order, now())
  on conflict (organization_id, module_id) do update
  set enabled = excluded.enabled, sort_order = excluded.sort_order, updated_at = now();
end;
$$;
revoke all on function public.update_module_setting(text, boolean, integer, uuid) from public, anon;
grant execute on function public.update_module_setting(text, boolean, integer, uuid) to authenticated;

create or replace function private.record_workspace_admin_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare org_id uuid;
declare entity_uuid uuid;
begin
  org_id := new.organization_id;
  entity_uuid := new.id;
  insert into public.audit_events (
    organization_id, actor_profile_id, event_type, entity_type, entity_id, metadata
  ) values (
    org_id, auth.uid(), tg_table_name || '.' || lower(tg_op), tg_table_name, entity_uuid, '{}'::jsonb
  );
  return new;
end;
$$;
revoke all on function private.record_workspace_admin_change() from public, anon, authenticated;
create trigger role_admin_audit after update on public.roles for each row execute function private.record_workspace_admin_change();
create trigger invitation_admin_audit after insert or update on public.invitations for each row execute function private.record_workspace_admin_change();

create or replace function private.record_organization_admin_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_events (
    organization_id, actor_profile_id, event_type, entity_type, entity_id, metadata
  ) values (
    new.id, auth.uid(), 'organizations.update', 'organizations', new.id, '{}'::jsonb
  );
  return new;
end;
$$;
revoke all on function private.record_organization_admin_change() from public, anon, authenticated;
create trigger organization_admin_audit after update on public.organizations for each row execute function private.record_organization_admin_change();

create or replace function private.record_module_admin_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_events (
    organization_id, actor_profile_id, event_type, entity_type, metadata
  ) values (
    new.organization_id, auth.uid(), 'module_settings.' || lower(tg_op), 'module_setting',
    jsonb_build_object('module_id', new.module_id, 'enabled', new.enabled, 'sort_order', new.sort_order)
  );
  return new;
end;
$$;
revoke all on function private.record_module_admin_change() from public, anon, authenticated;
create trigger module_admin_audit after insert or update on public.module_settings for each row execute function private.record_module_admin_change();

alter table public.changelog_events enable row level security;
drop policy if exists "members can read changelog" on public.changelog_entries;
create policy "members can read published changelog"
on public.changelog_entries for select to authenticated
using (
  (status = 'published' and private.has_permission(organization_id, 'changelog.entries.view'))
  or private.has_permission(organization_id, 'changelog.entries.manage')
);
create policy "managers can create changelog"
on public.changelog_entries for insert to authenticated
with check (status = 'draft' and created_by = auth.uid() and private.has_permission(organization_id, 'changelog.entries.manage'));
create policy "managers can update changelog drafts"
on public.changelog_entries for update to authenticated
using (status <> 'published' and private.has_permission(organization_id, 'changelog.entries.manage'))
with check (private.has_permission(organization_id, 'changelog.entries.manage'));
create policy "members can read changelog history"
on public.changelog_events for select to authenticated
using (private.has_permission(organization_id, 'changelog.entries.manage'));

create policy "admins can update organizations"
on public.organizations for update to authenticated
using (private.has_permission(id, 'settings.workspace.manage'))
with check (private.has_permission(id, 'settings.workspace.manage'));
create policy "admins can update roles"
on public.roles for update to authenticated
using (private.has_permission(organization_id, 'settings.workspace.manage'))
with check (private.has_permission(organization_id, 'settings.workspace.manage'));

revoke all on table public.changelog_entries from public, anon, authenticated;
grant select, insert on table public.changelog_entries to authenticated;
grant update (version, title, summary, updated_at) on table public.changelog_entries to authenticated;
revoke all on table public.changelog_events from public, anon, authenticated;
grant select on table public.changelog_events to authenticated;

grant update (name, updated_at) on table public.organizations to authenticated;
grant update (name, color, updated_at) on table public.roles to authenticated;
revoke all on table public.module_settings from public, anon, authenticated;
grant select, insert on table public.module_settings to authenticated;
grant update (enabled, sort_order, updated_at) on table public.module_settings to authenticated;
revoke all on table public.invitations from public, anon, authenticated;
grant select, insert on table public.invitations to authenticated;
grant update (revoked_at) on table public.invitations to authenticated;
grant select on table public.audit_events to authenticated;
