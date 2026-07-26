create type public.project_status as enum (
  'planned',
  'active',
  'on_hold',
  'completed',
  'cancelled'
);

create type public.project_health as enum (
  'on_track',
  'at_risk',
  'off_track'
);

create type public.project_event_kind as enum (
  'created',
  'updated',
  'status',
  'health',
  'member'
);

alter table public.module_settings
  drop constraint if exists module_settings_module_id_check;
alter table public.module_settings
  add constraint module_settings_module_id_check check (
    module_id in (
      'inicio',
      'vacaciones',
      'proyectos',
      'tareas',
      'incidencias',
      'tesoreria',
      'nominas',
      'personal',
      'novedades',
      'configuracion'
    )
  );

alter table public.permissions
  drop constraint if exists permissions_code_check;
alter table public.permissions
  add constraint permissions_code_check check (
    code ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.(view|create|update|update_assigned|approve|manage|export)$'
  );

alter table public.profiles
  add column alias text,
  add column locale text not null default 'es-ES',
  add column timezone text not null default 'Europe/Madrid',
  add column theme text not null default 'system'
    check (theme in ('light', 'dark', 'system')),
  add column density text not null default 'comfortable'
    check (density in ('comfortable', 'compact')),
  add column reduced_motion boolean not null default false,
  add column high_contrast boolean not null default false,
  add column default_dashboard text not null default 'control-center',
  add column notification_preferences jsonb not null default
    '{"in_app":true,"assignments":true,"reviews":true}'::jsonb,
  add column simulated_role public.person_role_code,
  add constraint profiles_alias_length check (
    alias is null or char_length(alias) between 2 and 80
  );

create unique index people_org_profile_unique_idx
  on public.people (organization_id, profile_id)
  where profile_id is not null;

insert into public.people (
  organization_id,
  profile_id,
  display_name,
  team,
  position_title,
  status,
  role_code
)
select
  membership.organization_id,
  membership.profile_id,
  profile.display_name,
  'Equipo principal',
  'Miembro del workspace',
  case membership.status
    when 'active' then 'active'::public.person_status
    when 'suspended' then 'suspended'::public.person_status
    else 'invited'::public.person_status
  end,
  case role.code
    when 'admin' then 'admin'::public.person_role_code
    when 'manager' then 'manager'::public.person_role_code
    when 'viewer' then 'viewer'::public.person_role_code
    else 'collaborator'::public.person_role_code
  end
from public.memberships membership
join public.profiles profile on profile.id = membership.profile_id
join public.roles role on role.id = membership.role_id
on conflict (organization_id, profile_id) where profile_id is not null
do nothing;

create or replace function private.ensure_membership_person()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
  membership_role text;
begin
  select display_name into profile_name
  from public.profiles
  where id = new.profile_id;

  select code into membership_role
  from public.roles
  where id = new.role_id
    and organization_id = new.organization_id;

  insert into public.people (
    organization_id,
    profile_id,
    display_name,
    team,
    position_title,
    status,
    role_code
  ) values (
    new.organization_id,
    new.profile_id,
    coalesce(profile_name, 'Usuario del workspace'),
    'Equipo principal',
    'Miembro del workspace',
    case new.status
      when 'active' then 'active'::public.person_status
      when 'suspended' then 'suspended'::public.person_status
      else 'invited'::public.person_status
    end,
    case membership_role
      when 'admin' then 'admin'::public.person_role_code
      when 'manager' then 'manager'::public.person_role_code
      when 'viewer' then 'viewer'::public.person_role_code
      else 'collaborator'::public.person_role_code
    end
  )
  on conflict (organization_id, profile_id) where profile_id is not null
  do update set
    status = excluded.status,
    role_code = excluded.role_code,
    updated_at = now();

  insert into public.module_settings (
    organization_id,
    module_id,
    enabled,
    sort_order
  ) values (
    new.organization_id,
    'proyectos',
    true,
    2
  )
  on conflict (organization_id, module_id) do nothing;

  return new;
end;
$$;

revoke all on function private.ensure_membership_person()
from public, anon, authenticated;

create trigger ensure_membership_person
after insert or update of role_id, status on public.memberships
for each row execute function private.ensure_membership_person();

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null check (code ~ '^[A-Z][A-Z0-9-]{1,15}$'),
  name text not null check (char_length(name) between 3 and 120),
  summary text not null default '' check (char_length(summary) <= 1000),
  status public.project_status not null default 'planned',
  health public.project_health not null default 'on_track',
  owner_person_id uuid references public.people(id) on delete set null,
  start_date date,
  target_date date,
  color text not null default '#4f46e5'
    check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  check (target_date is null or start_date is null or target_date >= start_date)
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (project_id, person_id)
);

create table public.project_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  kind public.project_event_kind not null,
  note text not null check (char_length(note) between 3 and 1000),
  created_at timestamptz not null default now()
);

alter table public.tasks
  add column project_id uuid references public.projects(id) on delete set null,
  add column assignee_person_id uuid references public.people(id) on delete set null;

alter table public.incidents
  add column project_id uuid references public.projects(id) on delete set null,
  add column requester_person_id uuid references public.people(id) on delete restrict,
  add column assignee_person_id uuid references public.people(id) on delete set null;

alter table public.leave_requests
  add column person_id uuid references public.people(id) on delete restrict;

update public.tasks task
set assignee_person_id = person.id
from public.people person
where person.organization_id = task.organization_id
  and person.profile_id = task.assignee_profile_id;

update public.incidents incident
set requester_person_id = person.id
from public.people person
where person.organization_id = incident.organization_id
  and person.profile_id = incident.requester_profile_id;

update public.incidents incident
set assignee_person_id = person.id
from public.people person
where person.organization_id = incident.organization_id
  and person.profile_id = incident.assignee_profile_id;

update public.leave_requests request
set person_id = person.id
from public.people person
where person.organization_id = request.organization_id
  and person.profile_id = request.profile_id;

alter table public.incidents alter column requester_person_id set not null;
alter table public.leave_requests alter column person_id set not null;

create or replace function private.validate_task_relations()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assignee_person_id is null and new.assignee_profile_id is not null then
    select person.id into new.assignee_person_id
    from public.people person
    where person.organization_id = new.organization_id
      and person.profile_id = new.assignee_profile_id;
  end if;
  if new.project_id is not null and not exists (
    select 1 from public.projects project
    where project.id = new.project_id
      and project.organization_id = new.organization_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'task project must belong to the organization';
  end if;
  if new.assignee_person_id is not null and not exists (
    select 1 from public.people person
    where person.id = new.assignee_person_id
      and person.organization_id = new.organization_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'task assignee must belong to the organization';
  end if;
  return new;
end;
$$;

create or replace function private.validate_incident_relations()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.requester_person_id is null then
    select person.id into new.requester_person_id
    from public.people person
    where person.organization_id = new.organization_id
      and person.profile_id = new.requester_profile_id;
  end if;
  if new.assignee_person_id is null and new.assignee_profile_id is not null then
    select person.id into new.assignee_person_id
    from public.people person
    where person.organization_id = new.organization_id
      and person.profile_id = new.assignee_profile_id;
  end if;
  if not exists (
    select 1 from public.people person
    where person.id = new.requester_person_id
      and person.organization_id = new.organization_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'incident requester must belong to the organization';
  end if;
  if new.assignee_person_id is not null and not exists (
    select 1 from public.people person
    where person.id = new.assignee_person_id
      and person.organization_id = new.organization_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'incident assignee must belong to the organization';
  end if;
  if new.project_id is not null and not exists (
    select 1 from public.projects project
    where project.id = new.project_id
      and project.organization_id = new.organization_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'incident project must belong to the organization';
  end if;
  return new;
end;
$$;

create or replace function private.validate_leave_person()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.person_id is null then
    select person.id into new.person_id
    from public.people person
    where person.organization_id = new.organization_id
      and person.profile_id = new.profile_id;
  end if;
  if not exists (
    select 1 from public.people person
    where person.id = new.person_id
      and person.organization_id = new.organization_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'leave person must belong to the organization';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_task_relations()
from public, anon, authenticated;
revoke all on function private.validate_incident_relations()
from public, anon, authenticated;
revoke all on function private.validate_leave_person()
from public, anon, authenticated;

create trigger validate_task_relations
before insert or update of organization_id, project_id, assignee_person_id
on public.tasks
for each row execute function private.validate_task_relations();

create trigger validate_incident_relations
before insert or update of organization_id, project_id, requester_person_id,
  assignee_person_id
on public.incidents
for each row execute function private.validate_incident_relations();

create trigger validate_leave_person
before insert or update of organization_id, person_id on public.leave_requests
for each row execute function private.validate_leave_person();

create index projects_org_status_health_idx
  on public.projects (organization_id, status, health, target_date);
create index projects_org_owner_idx
  on public.projects (organization_id, owner_person_id);
create index project_members_org_person_idx
  on public.project_members (organization_id, person_id, project_id);
create index project_events_org_project_idx
  on public.project_events (organization_id, project_id, created_at desc);
create index tasks_org_project_status_idx
  on public.tasks (organization_id, project_id, status, due_date);
create index tasks_org_assignee_person_idx
  on public.tasks (organization_id, assignee_person_id, status, due_date);
create index incidents_org_project_status_idx
  on public.incidents (organization_id, project_id, status, priority);
create index leave_requests_person_dates_idx
  on public.leave_requests (person_id, start_date, end_date);

create or replace function private.validate_project_relations()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_person_id is not null and not exists (
    select 1 from public.people person
    where person.id = new.owner_person_id
      and person.organization_id = new.organization_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'project owner must belong to the organization';
  end if;
  return new;
end;
$$;

create or replace function private.validate_project_member()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.projects project
    join public.people person on person.id = new.person_id
    where project.id = new.project_id
      and project.organization_id = new.organization_id
      and person.organization_id = new.organization_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'project member must belong to the same organization';
  end if;
  return new;
end;
$$;

create trigger validate_project_relations
before insert or update on public.projects
for each row execute function private.validate_project_relations();

create trigger validate_project_member
before insert or update on public.project_members
for each row execute function private.validate_project_member();

create or replace function private.record_project_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_kind public.project_event_kind;
begin
  if tg_op = 'INSERT' then
    event_kind := 'created';
  elsif old.status is distinct from new.status then
    event_kind := 'status';
  elsif old.health is distinct from new.health then
    event_kind := 'health';
  else
    event_kind := 'updated';
  end if;

  insert into public.project_events (
    organization_id,
    project_id,
    actor_profile_id,
    kind,
    note
  ) values (
    new.organization_id,
    new.id,
    auth.uid(),
    event_kind,
    case event_kind
      when 'created' then 'Proyecto creado.'
      when 'status' then 'Estado del proyecto actualizado.'
      when 'health' then 'Salud del proyecto actualizada.'
      else 'Proyecto actualizado.'
    end
  );
  return new;
end;
$$;

create or replace function private.record_project_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_events (
    organization_id,
    project_id,
    actor_profile_id,
    kind,
    note
  ) values (
    new.organization_id,
    new.project_id,
    new.created_by,
    'member',
    'Miembro añadido al proyecto.'
  );
  return new;
end;
$$;

revoke all on function private.validate_project_relations()
from public, anon, authenticated;
revoke all on function private.validate_project_member()
from public, anon, authenticated;
revoke all on function private.record_project_change()
from public, anon, authenticated;
revoke all on function private.record_project_member()
from public, anon, authenticated;

create trigger record_project_change
after insert or update of name, summary, status, health, owner_person_id,
  start_date, target_date, color
on public.projects
for each row execute function private.record_project_change();

create trigger record_project_member
after insert on public.project_members
for each row execute function private.record_project_member();

create or replace function private.record_task_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.task_events (
    organization_id,
    task_id,
    actor_profile_id,
    kind,
    from_status,
    to_status,
    note
  ) values (
    new.organization_id,
    new.id,
    auth.uid(),
    case
      when old.assignee_person_id is distinct from new.assignee_person_id
        then 'assigned'::public.task_event_kind
      else 'updated'::public.task_event_kind
    end,
    old.status,
    new.status,
    case
      when old.assignee_person_id is distinct from new.assignee_person_id
        then 'Responsable actualizado.'
      when old.project_id is distinct from new.project_id
        then 'Proyecto vinculado actualizado.'
      else 'Datos de la tarea actualizados.'
    end
  );
  return new;
end;
$$;

revoke all on function private.record_task_update()
from public, anon, authenticated;

drop trigger if exists record_task_update on public.tasks;
create trigger record_task_update
after update of title, description, priority, assignee_person_id, project_id,
  due_date
on public.tasks
for each row execute function private.record_task_update();

insert into public.permissions (code, description)
values
  ('projects.items.view', 'Consultar el portfolio y el detalle de proyectos'),
  ('projects.items.manage', 'Crear y administrar proyectos y sus miembros'),
  ('tasks.items.create', 'Crear tareas dentro del workspace'),
  ('tasks.items.update_assigned', 'Actualizar tareas asignadas dentro del workspace'),
  ('incidents.tickets.create', 'Registrar incidencias dentro del workspace'),
  ('incidents.tickets.update_assigned', 'Actualizar incidencias asignadas dentro del workspace'),
  ('profile.self.update', 'Actualizar preferencias propias del perfil'),
  ('analytics.dashboards.view', 'Consultar paneles y métricas agregadas'),
  ('analytics.dashboards.export', 'Exportar métricas agregadas autorizadas'),
  ('integrations.runs.view', 'Consultar ejecuciones de integraciones'),
  ('integrations.runs.manage', 'Administrar ejecuciones de integraciones')
on conflict (code) do nothing;

create or replace function private.simulated_role_allows(
  target_role public.person_role_code,
  required_permission text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case target_role
    when 'admin' then true
    when 'manager' then
      required_permission <> 'settings.workspace.manage'
      and required_permission not like 'payroll.%.manage'
      and required_permission not like 'treasury.%.manage'
    when 'collaborator' then
      required_permission in (
        'vacations.requests.view',
        'vacations.requests.create',
        'projects.items.view',
        'tasks.items.view',
        'tasks.items.create',
        'tasks.items.update_assigned',
        'incidents.tickets.view',
        'incidents.tickets.create',
        'incidents.tickets.update_assigned',
        'people.profiles.view',
        'changelog.entries.view',
        'analytics.dashboards.view',
        'integrations.runs.view',
        'profile.self.update'
      )
    when 'viewer' then
      required_permission like '%.view'
      or required_permission = 'profile.self.update'
    else false
  end;
$$;

revoke all on function private.simulated_role_allows(
  public.person_role_code,
  text
) from public, anon, authenticated;

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
    from public.memberships membership
    join public.role_permissions assignment
      on assignment.role_id = membership.role_id
    join public.permissions permission
      on permission.id = assignment.permission_id
    join public.profiles profile
      on profile.id = membership.profile_id
    where membership.organization_id = target_organization_id
      and membership.profile_id = auth.uid()
      and membership.status = 'active'
      and permission.code = required_permission
      and (
        profile.simulated_role is null
        or private.simulated_role_allows(
          profile.simulated_role,
          required_permission
        )
      )
  );
$$;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
cross join public.permissions permission
where role.code = 'demo_admin'
  and not exists (
    select 1 from public.role_permissions current_assignment
    where current_assignment.role_id = role.id
      and current_assignment.permission_id = permission.id
  );

insert into public.module_settings (
  organization_id,
  module_id,
  enabled,
  sort_order
)
select organization.id, 'proyectos', true, 2
from public.organizations organization
on conflict (organization_id, module_id) do nothing;

update public.module_settings
set sort_order = sort_order + 1
where module_id not in ('inicio', 'vacaciones', 'proyectos')
  and sort_order >= 2;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_events enable row level security;

create policy "authorized members can read projects"
on public.projects for select to authenticated
using (private.has_permission(organization_id, 'projects.items.view'));

create policy "authorized members can manage projects"
on public.projects for all to authenticated
using (private.has_permission(organization_id, 'projects.items.manage'))
with check (
  created_by = auth.uid()
  and private.has_permission(organization_id, 'projects.items.manage')
);

create policy "authorized members can read project members"
on public.project_members for select to authenticated
using (private.has_permission(organization_id, 'projects.items.view'));

create policy "authorized members can manage project members"
on public.project_members for all to authenticated
using (private.has_permission(organization_id, 'projects.items.manage'))
with check (
  created_by = auth.uid()
  and private.has_permission(organization_id, 'projects.items.manage')
);

create policy "authorized members can read project events"
on public.project_events for select to authenticated
using (private.has_permission(organization_id, 'projects.items.view'));

revoke all on table
  public.projects,
  public.project_members,
  public.project_events
from public, anon, authenticated;

grant select, insert on table public.projects to authenticated;
grant update (
  name,
  summary,
  status,
  health,
  owner_person_id,
  start_date,
  target_date,
  color,
  updated_at
) on table public.projects to authenticated;
grant delete on table public.projects to authenticated;
grant select, insert, delete on table public.project_members to authenticated;
grant select on table public.project_events to authenticated;

grant update (
  alias,
  locale,
  timezone,
  theme,
  density,
  reduced_motion,
  high_contrast,
  default_dashboard,
  notification_preferences,
  simulated_role,
  updated_at
) on table public.profiles to authenticated;

grant update (
  title,
  description,
  priority,
  assignee_person_id,
  project_id,
  due_date,
  updated_at
) on table public.tasks to authenticated;

grant update (
  title,
  description,
  priority,
  category,
  assignee_person_id,
  project_id,
  updated_at
) on table public.incidents to authenticated;

create or replace function public.transition_incident(
  target_incident_id uuid,
  target_status public.incident_status,
  transition_note text,
  expected_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_incident public.incidents%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_permission(
    expected_organization_id,
    'incidents.tickets.manage'
  ) then
    raise exception 'permission denied';
  end if;
  if char_length(trim(transition_note)) < 3 then
    raise exception 'transition note required';
  end if;

  select * into current_incident
  from public.incidents
  where id = target_incident_id
    and organization_id = expected_organization_id
  for update;
  if not found then raise exception 'incident not found'; end if;

  if not (
    (current_incident.status = 'registered' and target_status = 'triaged') or
    (current_incident.status = 'triaged' and target_status = 'assigned') or
    (current_incident.status = 'assigned' and target_status = 'investigating') or
    (current_incident.status = 'investigating' and target_status = 'resolved') or
    (current_incident.status = 'resolved' and target_status in ('closed', 'investigating'))
  ) then
    raise exception 'invalid incident transition';
  end if;

  if target_status = 'assigned'
    and current_incident.assignee_person_id is null
  then
    raise exception 'incident assignment required';
  end if;

  update public.incidents
  set status = target_status,
      resolution = case
        when target_status = 'resolved' then trim(transition_note)
        when target_status = 'investigating'
          and current_incident.status = 'resolved' then null
        else resolution
      end,
      updated_at = now()
  where id = current_incident.id;

  insert into public.incident_events (
    organization_id,
    incident_id,
    actor_profile_id,
    kind,
    from_status,
    to_status,
    note
  ) values (
    current_incident.organization_id,
    current_incident.id,
    auth.uid(),
    'status',
    current_incident.status,
    target_status,
    trim(transition_note)
  );

  insert into public.audit_events (
    organization_id,
    actor_profile_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  ) values (
    current_incident.organization_id,
    auth.uid(),
    'incident.transitioned',
    'incident',
    current_incident.id,
    jsonb_build_object(
      'from',
      current_incident.status,
      'to',
      target_status
    )
  );
end;
$$;
