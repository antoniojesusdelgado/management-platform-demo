create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.membership_status as enum ('invited', 'active', 'suspended');
create type public.leave_request_status as enum (
  'draft',
  'submitted',
  'approved',
  'rejected',
  'cancelled'
);
create type public.leave_type as enum ('vacation', 'personal');
create type public.work_item_status as enum (
  'backlog',
  'active',
  'blocked',
  'completed',
  'archived'
);
create type public.incident_priority as enum ('low', 'medium', 'high', 'critical');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 100),
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, 'usuario'), '@', 1)
    ),
    new.email,
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null check (code ~ '^[a-z][a-z0-9_]{1,39}$'),
  name text not null check (char_length(name) between 2 and 60),
  color text not null default '#2563eb' check (color ~ '^#[0-9a-fA-F]{6}$'),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (
    code ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.(view|create|update|approve|manage)$'
  ),
  description text not null check (char_length(description) between 5 and 180)
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  status public.membership_status not null default 'invited',
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email = lower(email)),
  role_id uuid not null references public.roles(id) on delete restrict,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  logo_path text,
  primary_color text not null default '#2563eb' check (
    primary_color ~ '^#[0-9a-fA-F]{6}$'
  ),
  locale text not null default 'es-ES',
  timezone text not null default 'Europe/Madrid',
  updated_at timestamptz not null default now()
);

create table public.module_settings (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_id text not null check (
    module_id in (
      'inicio',
      'vacaciones',
      'tareas',
      'incidencias',
      'tesoreria',
      'nominas',
      'personal',
      'novedades',
      'configuracion'
    )
  ),
  enabled boolean not null default true,
  sort_order smallint not null default 0 check (sort_order >= 0),
  updated_at timestamptz not null default now(),
  primary key (organization_id, module_id)
);

create table public.leave_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  annual_days smallint not null check (annual_days between 0 and 60),
  requires_approval boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.business_days_between(
  start_value date,
  end_value date
)
returns integer
language sql
immutable
set search_path = ''
as $$
  select count(*)::integer
  from generate_series(start_value, end_value, interval '1 day') as day_value
  where extract(isodow from day_value) < 6;
$$;

revoke all on function private.business_days_between(date, date)
from public, anon, authenticated;

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  business_days integer generated always as (
    private.business_days_between(start_date, end_date)
  ) stored,
  leave_type public.leave_type not null,
  reason text not null check (char_length(reason) between 8 and 300),
  status public.leave_request_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (end_date - start_date <= 60)
);

create table public.leave_request_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  request_id uuid not null references public.leave_requests(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  from_status public.leave_request_status,
  to_status public.leave_request_status not null,
  note text not null check (char_length(note) between 3 and 300),
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '',
  status public.work_item_status not null default 'backlog',
  assignee_profile_id uuid references public.profiles(id) on delete set null,
  due_date date,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference text not null,
  title text not null check (char_length(title) between 3 and 160),
  description text not null check (char_length(description) between 8 and 2000),
  status public.work_item_status not null default 'active',
  priority public.incident_priority not null default 'medium',
  requester_profile_id uuid not null references public.profiles(id) on delete restrict,
  assignee_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, reference)
);

create table public.treasury_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entry_date date not null,
  concept text not null check (char_length(concept) between 3 and 160),
  amount_cents bigint not null,
  currency char(3) not null default 'EUR',
  status public.work_item_status not null default 'backlog',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status public.work_item_status not null default 'backlog',
  notes text not null default '',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  unique (organization_id, period_start, period_end)
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  display_name text not null check (char_length(display_name) between 2 and 100),
  team text not null default '',
  position_title text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.changelog_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  version text not null check (char_length(version) between 1 and 30),
  title text not null check (char_length(title) between 3 and 120),
  summary text not null check (char_length(summary) between 8 and 1000),
  published_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (organization_id, version)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (char_length(event_type) between 3 and 100),
  entity_type text not null check (char_length(entity_type) between 3 and 80),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index memberships_profile_status_idx
  on public.memberships (profile_id, status, organization_id);
create index memberships_org_role_idx
  on public.memberships (organization_id, role_id);
create index invitations_org_email_idx
  on public.invitations (organization_id, email);
create index leave_requests_org_status_idx
  on public.leave_requests (organization_id, status, start_date);
create index leave_requests_profile_idx
  on public.leave_requests (profile_id, created_at desc);
create index leave_events_org_request_idx
  on public.leave_request_events (organization_id, request_id, created_at desc);
create index tasks_org_status_idx on public.tasks (organization_id, status, due_date);
create index incidents_org_status_idx
  on public.incidents (organization_id, status, priority);
create index treasury_org_date_idx
  on public.treasury_entries (organization_id, entry_date desc);
create index payroll_org_period_idx
  on public.payroll_runs (organization_id, period_start desc);
create index people_org_active_idx on public.people (organization_id, active);
create index changelog_org_published_idx
  on public.changelog_entries (organization_id, published_at desc);
create index audit_org_created_idx
  on public.audit_events (organization_id, created_at desc);

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = target_organization_id
      and m.profile_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function private.has_permission(
  target_organization_id uuid,
  required_permission text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.memberships m
    join public.role_permissions rp on rp.role_id = m.role_id
    join public.permissions p on p.id = rp.permission_id
    where m.organization_id = target_organization_id
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and p.code = required_permission
  );
$$;

revoke all on function private.is_org_member(uuid) from public, anon;
revoke all on function private.has_permission(uuid, text) from public, anon;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_permission(uuid, text) to authenticated;

create or replace function public.transition_leave_request(
  target_request_id uuid,
  target_status public.leave_request_status,
  transition_note text,
  expected_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_request public.leave_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not private.has_permission(
    expected_organization_id,
    'vacations.requests.approve'
  ) then
    raise exception 'permission denied';
  end if;

  select *
  into current_request
  from public.leave_requests
  where id = target_request_id
    and organization_id = expected_organization_id
  for update;

  if not found then
    raise exception 'leave request not found';
  end if;

  if not (
    (current_request.status = 'submitted' and target_status in ('approved', 'rejected', 'cancelled'))
    or (current_request.status = 'approved' and target_status = 'cancelled')
  ) then
    raise exception 'invalid leave request transition';
  end if;

  update public.leave_requests
  set status = target_status,
      updated_at = now()
  where id = current_request.id;

  insert into public.leave_request_events (
    organization_id,
    request_id,
    actor_profile_id,
    from_status,
    to_status,
    note
  )
  values (
    current_request.organization_id,
    current_request.id,
    auth.uid(),
    current_request.status,
    target_status,
    transition_note
  );

  insert into public.audit_events (
    organization_id,
    actor_profile_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    current_request.organization_id,
    auth.uid(),
    'leave_request.transitioned',
    'leave_request',
    current_request.id,
    jsonb_build_object(
      'from', current_request.status,
      'to', target_status
    )
  );
end;
$$;

revoke all on function public.transition_leave_request(
  uuid,
  public.leave_request_status,
  text,
  uuid
) from public, anon;
grant execute on function public.transition_leave_request(
  uuid,
  public.leave_request_status,
  text,
  uuid
) to authenticated;

insert into public.permissions (code, description)
values
  ('vacations.requests.view', 'Consultar solicitudes de vacaciones'),
  ('vacations.requests.create', 'Crear solicitudes de vacaciones'),
  ('vacations.requests.approve', 'Aprobar o rechazar solicitudes'),
  ('tasks.items.view', 'Consultar tareas'),
  ('tasks.items.manage', 'Gestionar tareas'),
  ('incidents.tickets.view', 'Consultar incidencias'),
  ('incidents.tickets.manage', 'Gestionar incidencias'),
  ('treasury.entries.view', 'Consultar movimientos de tesorería'),
  ('payroll.runs.view', 'Consultar ciclos de nómina'),
  ('people.profiles.view', 'Consultar perfiles del equipo'),
  ('changelog.entries.view', 'Consultar novedades'),
  ('settings.workspace.manage', 'Gestionar configuración, roles y permisos')
on conflict (code) do nothing;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.organization_settings enable row level security;
alter table public.module_settings enable row level security;
alter table public.leave_policies enable row level security;
alter table public.leave_requests enable row level security;
alter table public.leave_request_events enable row level security;
alter table public.tasks enable row level security;
alter table public.incidents enable row level security;
alter table public.treasury_entries enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.people enable row level security;
alter table public.changelog_entries enable row level security;
alter table public.audit_events enable row level security;

create policy "members can read organizations"
on public.organizations for select
to authenticated
using (private.is_org_member(id));

create policy "users can read their profile"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.memberships viewer
    join public.memberships subject
      on subject.organization_id = viewer.organization_id
    where viewer.profile_id = auth.uid()
      and viewer.status = 'active'
      and subject.profile_id = profiles.id
      and subject.status = 'active'
  )
);

create policy "users can update their profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "members can read permissions"
on public.permissions for select
to authenticated
using (true);

create policy "members can read roles"
on public.roles for select
to authenticated
using (private.is_org_member(organization_id));

create policy "members can read role permissions"
on public.role_permissions for select
to authenticated
using (
  exists (
    select 1
    from public.roles r
    where r.id = role_permissions.role_id
      and private.is_org_member(r.organization_id)
  )
);

create policy "members can read memberships"
on public.memberships for select
to authenticated
using (private.is_org_member(organization_id));

create policy "admins can manage invitations"
on public.invitations for all
to authenticated
using (private.has_permission(organization_id, 'settings.workspace.manage'))
with check (private.has_permission(organization_id, 'settings.workspace.manage'));

create policy "members can read organization settings"
on public.organization_settings for select
to authenticated
using (private.is_org_member(organization_id));

create policy "admins can manage organization settings"
on public.organization_settings for all
to authenticated
using (private.has_permission(organization_id, 'settings.workspace.manage'))
with check (private.has_permission(organization_id, 'settings.workspace.manage'));

create policy "members can read module settings"
on public.module_settings for select
to authenticated
using (private.is_org_member(organization_id));

create policy "admins can manage module settings"
on public.module_settings for all
to authenticated
using (private.has_permission(organization_id, 'settings.workspace.manage'))
with check (private.has_permission(organization_id, 'settings.workspace.manage'));

create policy "members can read leave policies"
on public.leave_policies for select
to authenticated
using (private.is_org_member(organization_id));

create policy "members can read leave requests"
on public.leave_requests for select
to authenticated
using (
  private.has_permission(organization_id, 'vacations.requests.view')
  or profile_id = auth.uid()
);

create policy "members can create their leave requests"
on public.leave_requests for insert
to authenticated
with check (
  profile_id = auth.uid()
  and private.has_permission(organization_id, 'vacations.requests.create')
  and status in ('draft', 'submitted')
);

create policy "members can update their drafts"
on public.leave_requests for update
to authenticated
using (profile_id = auth.uid() and status = 'draft')
with check (profile_id = auth.uid() and status in ('draft', 'submitted'));

create policy "members can read leave history"
on public.leave_request_events for select
to authenticated
using (
  private.has_permission(organization_id, 'vacations.requests.view')
  or exists (
    select 1
    from public.leave_requests request
    where request.id = leave_request_events.request_id
      and request.profile_id = auth.uid()
  )
);

create policy "members can read tasks"
on public.tasks for select
to authenticated
using (private.has_permission(organization_id, 'tasks.items.view'));

create policy "managers can manage tasks"
on public.tasks for all
to authenticated
using (private.has_permission(organization_id, 'tasks.items.manage'))
with check (private.has_permission(organization_id, 'tasks.items.manage'));

create policy "members can read incidents"
on public.incidents for select
to authenticated
using (private.has_permission(organization_id, 'incidents.tickets.view'));

create policy "managers can manage incidents"
on public.incidents for all
to authenticated
using (private.has_permission(organization_id, 'incidents.tickets.manage'))
with check (private.has_permission(organization_id, 'incidents.tickets.manage'));

create policy "authorized members can read treasury"
on public.treasury_entries for select
to authenticated
using (private.has_permission(organization_id, 'treasury.entries.view'));

create policy "authorized members can read payroll"
on public.payroll_runs for select
to authenticated
using (private.has_permission(organization_id, 'payroll.runs.view'));

create policy "authorized members can read people"
on public.people for select
to authenticated
using (private.has_permission(organization_id, 'people.profiles.view'));

create policy "members can read changelog"
on public.changelog_entries for select
to authenticated
using (private.has_permission(organization_id, 'changelog.entries.view'));

create policy "admins can read audit events"
on public.audit_events for select
to authenticated
using (private.has_permission(organization_id, 'settings.workspace.manage'));
