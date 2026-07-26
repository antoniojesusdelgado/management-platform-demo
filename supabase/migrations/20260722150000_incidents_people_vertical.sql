create type public.incident_status as enum (
  'registered', 'triaged', 'assigned', 'investigating', 'resolved', 'closed'
);
create type public.incident_category as enum (
  'access', 'data', 'hardware', 'software', 'other'
);
create type public.incident_event_kind as enum (
  'created', 'updated', 'assigned', 'status', 'priority'
);
create type public.person_status as enum ('invited', 'active', 'suspended', 'inactive');
create type public.person_role_code as enum ('admin', 'manager', 'collaborator', 'viewer');
create type public.people_event_kind as enum ('created', 'updated', 'status', 'role');

alter table public.incidents alter column status drop default;
alter table public.incidents
  alter column status type public.incident_status
  using (
    case status::text
      when 'backlog' then 'registered'
      when 'active' then 'investigating'
      when 'blocked' then 'investigating'
      when 'completed' then 'resolved'
      when 'archived' then 'closed'
    end
  )::public.incident_status;
alter table public.incidents alter column status set default 'registered';
alter table public.incidents
  add column category public.incident_category not null default 'other',
  add column sla_due_at timestamptz not null default (now() + interval '72 hours'),
  add column resolution text check (resolution is null or char_length(resolution) between 3 and 2000);

alter table public.people
  add column status public.person_status not null default 'active',
  add column role_code public.person_role_code not null default 'collaborator';
update public.people set status = case when active then 'active' else 'inactive' end::public.person_status;
alter table public.people drop column active;
update public.people set team = 'Sin equipo' where char_length(trim(team)) < 2;
update public.people set position_title = 'Sin puesto' where char_length(trim(position_title)) < 2;
alter table public.people
  alter column team set default 'Sin equipo',
  alter column position_title set default 'Sin puesto',
  add constraint people_team_length check (char_length(team) between 2 and 100),
  add constraint people_position_length check (char_length(position_title) between 2 and 120);

create table public.incident_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  kind public.incident_event_kind not null,
  from_status public.incident_status,
  to_status public.incident_status,
  note text not null check (char_length(note) between 3 and 2000),
  created_at timestamptz not null default now()
);

create table public.people_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  kind public.people_event_kind not null,
  note text not null check (char_length(note) between 3 and 1000),
  created_at timestamptz not null default now()
);

create or replace function private.record_incident_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare event_kind public.incident_event_kind;
begin
  if tg_op = 'INSERT' then
    event_kind := 'created';
  elsif old.status is distinct from new.status then
    return new;
  elsif old.assignee_profile_id is distinct from new.assignee_profile_id then
    event_kind := 'assigned';
  elsif old.priority is distinct from new.priority then
    event_kind := 'priority';
  else
    event_kind := 'updated';
  end if;
  insert into public.incident_events (
    organization_id, incident_id, actor_profile_id, kind, from_status, to_status, note
  ) values (
    new.organization_id, new.id, auth.uid(), event_kind,
    case when tg_op = 'UPDATE' then old.status else null end, new.status,
    case event_kind
      when 'created' then 'Incidencia registrada.'
      when 'assigned' then 'Responsable actualizado.'
      when 'priority' then 'Prioridad actualizada.'
      else 'Incidencia actualizada.'
    end
  );
  return new;
end;
$$;
revoke all on function private.record_incident_change() from public, anon, authenticated;
create trigger incident_change_event
after insert or update on public.incidents
for each row execute function private.record_incident_change();

create or replace function private.record_person_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare event_kind public.people_event_kind;
begin
  if tg_op = 'INSERT' then event_kind := 'created';
  elsif old.status is distinct from new.status then event_kind := 'status';
  elsif old.role_code is distinct from new.role_code then event_kind := 'role';
  else event_kind := 'updated';
  end if;
  insert into public.people_events (
    organization_id, person_id, actor_profile_id, kind, note
  ) values (
    new.organization_id, new.id, auth.uid(), event_kind,
    case event_kind
      when 'created' then 'Perfil sintético añadido.'
      when 'status' then 'Estado del perfil actualizado.'
      when 'role' then 'Rol del perfil actualizado.'
      else 'Perfil sintético actualizado.'
    end
  );
  return new;
end;
$$;
revoke all on function private.record_person_change() from public, anon, authenticated;
create trigger person_change_event
after insert or update on public.people
for each row execute function private.record_person_change();

drop index if exists public.incidents_org_status_idx;
create index incidents_org_status_priority_idx on public.incidents (organization_id, status, priority);
create index incidents_org_sla_idx on public.incidents (organization_id, sla_due_at) where status not in ('resolved', 'closed');
create index incidents_assignee_idx on public.incidents (assignee_profile_id) where assignee_profile_id is not null;
create index incident_events_org_incident_idx on public.incident_events (organization_id, incident_id, created_at desc);
create index people_org_status_idx on public.people (organization_id, status, team);
create index people_profile_idx on public.people (profile_id) where profile_id is not null;
create index people_events_org_person_idx on public.people_events (organization_id, person_id, created_at desc);

insert into public.permissions (code, description)
values ('people.profiles.manage', 'Gestionar perfiles sintéticos del equipo')
on conflict (code) do nothing;

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
  if not private.has_permission(expected_organization_id, 'incidents.tickets.manage') then
    raise exception 'permission denied';
  end if;
  if char_length(trim(transition_note)) < 3 then raise exception 'transition note required'; end if;

  select * into current_incident
  from public.incidents
  where id = target_incident_id and organization_id = expected_organization_id
  for update;
  if not found then raise exception 'incident not found'; end if;

  if not (
    (current_incident.status = 'registered' and target_status = 'triaged') or
    (current_incident.status = 'triaged' and target_status = 'assigned') or
    (current_incident.status = 'assigned' and target_status = 'investigating') or
    (current_incident.status = 'investigating' and target_status = 'resolved') or
    (current_incident.status = 'resolved' and target_status in ('closed', 'investigating'))
  ) then raise exception 'invalid incident transition'; end if;

  if target_status = 'assigned' and current_incident.assignee_profile_id is null then
    raise exception 'incident assignment required';
  end if;

  update public.incidents
  set status = target_status,
      resolution = case
        when target_status = 'resolved' then trim(transition_note)
        when target_status = 'investigating' and current_incident.status = 'resolved' then null
        else resolution
      end,
      updated_at = now()
  where id = current_incident.id;
  insert into public.incident_events (
    organization_id, incident_id, actor_profile_id, kind, from_status, to_status, note
  ) values (
    current_incident.organization_id, current_incident.id, auth.uid(), 'status',
    current_incident.status, target_status, trim(transition_note)
  );
  insert into public.audit_events (
    organization_id, actor_profile_id, event_type, entity_type, entity_id, metadata
  ) values (
    current_incident.organization_id, auth.uid(), 'incident.transitioned', 'incident',
    current_incident.id, jsonb_build_object('from', current_incident.status, 'to', target_status)
  );
end;
$$;

revoke all on function public.transition_incident(uuid, public.incident_status, text, uuid)
from public, anon;
grant execute on function public.transition_incident(uuid, public.incident_status, text, uuid)
to authenticated;

alter table public.incident_events enable row level security;
alter table public.people_events enable row level security;

drop policy if exists "managers can manage incidents" on public.incidents;
create policy "managers can create incidents"
on public.incidents for insert to authenticated
with check (
  requester_profile_id = auth.uid()
  and private.has_permission(organization_id, 'incidents.tickets.manage')
  and (
    assignee_profile_id is null or exists (
      select 1 from public.memberships membership
      where membership.organization_id = incidents.organization_id
        and membership.profile_id = incidents.assignee_profile_id
        and membership.status = 'active'
    )
  )
);
create policy "managers can update incidents"
on public.incidents for update to authenticated
using (private.has_permission(organization_id, 'incidents.tickets.manage'))
with check (
  private.has_permission(organization_id, 'incidents.tickets.manage')
  and (
    assignee_profile_id is null or exists (
      select 1 from public.memberships membership
      where membership.organization_id = incidents.organization_id
        and membership.profile_id = incidents.assignee_profile_id
        and membership.status = 'active'
    )
  )
);

create policy "members can read incident events"
on public.incident_events for select to authenticated
using (private.has_permission(organization_id, 'incidents.tickets.view'));
create policy "managers can add incident events"
on public.incident_events for insert to authenticated
with check (
  actor_profile_id = auth.uid()
  and private.has_permission(organization_id, 'incidents.tickets.manage')
  and exists (
    select 1 from public.incidents incident
    where incident.id = incident_events.incident_id
      and incident.organization_id = incident_events.organization_id
  )
);

create policy "managers can manage people"
on public.people for all to authenticated
using (private.has_permission(organization_id, 'people.profiles.manage'))
with check (
  private.has_permission(organization_id, 'people.profiles.manage')
  and (
    profile_id is null or exists (
      select 1 from public.memberships membership
      where membership.organization_id = people.organization_id
        and membership.profile_id = people.profile_id
    )
  )
);
create policy "members can read people events"
on public.people_events for select to authenticated
using (private.has_permission(organization_id, 'people.profiles.view'));
create policy "managers can add people events"
on public.people_events for insert to authenticated
with check (
  actor_profile_id = auth.uid()
  and private.has_permission(organization_id, 'people.profiles.manage')
  and exists (
    select 1 from public.people person
    where person.id = people_events.person_id
      and person.organization_id = people_events.organization_id
  )
);

revoke all on table public.incidents from public, anon, authenticated;
grant select, insert on table public.incidents to authenticated;
grant update (title, description, priority, category, assignee_profile_id, updated_at)
on table public.incidents to authenticated;

revoke all on table public.incident_events from public, anon, authenticated;
grant select, insert on table public.incident_events to authenticated;

revoke all on table public.people from public, anon, authenticated;
grant select, insert on table public.people to authenticated;
grant update (display_name, team, position_title, status, role_code, updated_at)
on table public.people to authenticated;

revoke all on table public.people_events from public, anon, authenticated;
grant select, insert on table public.people_events to authenticated;
