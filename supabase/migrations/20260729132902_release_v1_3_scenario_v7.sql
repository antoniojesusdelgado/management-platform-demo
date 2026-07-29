-- Release v1.3.0: stable analytics dimensions and incremental Scenario V7.
-- This migration is additive. User-authored operational rows are never deleted
-- or rewritten by the scenario generator.

alter table public.organizations
  add column if not exists scenario_generated_through_date date;

update public.organizations
set scenario_generated_through_date = coalesce(
  scenario_generated_through_date,
  scenario_anchor_date,
  date '2026-06-17'
);

alter table public.organizations
  alter column scenario_generated_through_date
    set default ((timezone('Europe/Madrid', now())::date - 1)),
  alter column scenario_generated_through_date set not null;

alter table public.people
  add column if not exists employment_start_date date,
  add column if not exists employment_end_date date;

update public.people
set employment_start_date = coalesce(employment_start_date, date '2025-01-01');

alter table public.people
  alter column employment_start_date set default date '2025-01-01',
  alter column employment_start_date set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'people_employment_period_check'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_employment_period_check
      check (
        employment_end_date is null
        or employment_end_date >= employment_start_date
      );
  end if;
end;
$$;

create index if not exists people_organization_employment_period_idx
  on public.people (
    organization_id,
    employment_start_date,
    employment_end_date
  );

create table if not exists public.analytics_service_dimensions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  code text not null check (code ~ '^[a-z0-9]+(?:[-_][a-z0-9]+)*$'),
  label text not null check (length(label) between 2 and 120),
  kind text not null check (kind in ('incident', 'integration')),
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

alter table public.analytics_service_dimensions enable row level security;

drop policy if exists analytics_service_dimensions_member
  on public.analytics_service_dimensions;
create policy analytics_service_dimensions_member
on public.analytics_service_dimensions
for select
to authenticated
using ((select private.is_org_member(organization_id)));

grant select on public.analytics_service_dimensions to authenticated;
revoke all on public.analytics_service_dimensions from anon;

alter table public.incidents
  add column if not exists analytics_service_code text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'incidents_analytics_service_dimension_fkey'
      and conrelid = 'public.incidents'::regclass
  ) then
    alter table public.incidents
      add constraint incidents_analytics_service_dimension_fkey
      foreign key (organization_id, analytics_service_code)
      references public.analytics_service_dimensions(organization_id, code);
  end if;
end;
$$;

create index if not exists incidents_organization_service_idx
  on public.incidents (organization_id, analytics_service_code, created_at);

insert into public.analytics_service_dimensions (
  organization_id, code, label, kind
)
select connector.organization_id, connector.code, connector.name, 'integration'
from public.integration_connectors connector
on conflict (organization_id, code) do nothing;

insert into public.analytics_service_dimensions (
  organization_id, code, label, kind
)
select organization.id, dimension.code, dimension.label, 'incident'
from public.organizations organization
cross join (
  values
    ('incident-imports', 'Importaciones'),
    ('incident-access', 'Permisos'),
    ('incident-analytics', 'Analítica'),
    ('incident-treasury', 'Tesorería'),
    ('incident-directory', 'Directorio'),
    ('incident-notifications', 'Notificaciones')
) as dimension(code, label)
on conflict (organization_id, code) do nothing;

update public.incidents incident
set analytics_service_code = case lower(trim(incident.affected_service))
  when 'importaciones' then 'incident-imports'
  when 'permisos' then 'incident-access'
  when 'analítica' then 'incident-analytics'
  when 'analitica' then 'incident-analytics'
  when 'tesorería' then 'incident-treasury'
  when 'tesoreria' then 'incident-treasury'
  when 'directorio' then 'incident-directory'
  when 'notificaciones' then 'incident-notifications'
  else null
end
where incident.analytics_service_code is null;

with mapped_views as (
  select
    view.id,
    coalesce(
      connector.code,
      dimension.code
    ) as service_code
  from public.saved_analytics_views view
  left join public.integration_connectors connector
    on connector.organization_id = view.organization_id
   and (
     connector.id::text = view.filters ->> 'service'
     or lower(connector.name) = lower(view.filters ->> 'service')
     or connector.code = view.filters ->> 'service'
   )
  left join public.analytics_service_dimensions dimension
    on dimension.organization_id = view.organization_id
   and dimension.kind = 'incident'
   and (
     dimension.code = view.filters ->> 'service'
     or lower(dimension.label) = lower(view.filters ->> 'service')
   )
)
update public.saved_analytics_views view
set filters = jsonb_set(
  view.filters,
  '{service}',
  coalesce(to_jsonb(mapped.service_code), 'null'::jsonb),
  true
)
from mapped_views mapped
where mapped.id = view.id
  and view.filters ? 'service';

create table if not exists public.scenario_evolution_events (
  id uuid primary key,
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  event_date date not null,
  event_type text not null check (
    event_type in ('generated', 'workforce_adjustment')
  ),
  from_date date,
  through_date date not null,
  generated_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, event_date, event_type)
);

create index if not exists scenario_evolution_events_organization_date_idx
  on public.scenario_evolution_events (organization_id, event_date desc);

alter table public.scenario_evolution_events enable row level security;

drop policy if exists scenario_evolution_events_member
  on public.scenario_evolution_events;
create policy scenario_evolution_events_member
on public.scenario_evolution_events
for select
to authenticated
using ((select private.is_org_member(organization_id)));

grant select on public.scenario_evolution_events to authenticated;
revoke all on public.scenario_evolution_events from anon;

create or replace function private.scenario_v7_workforce_start_date(
  sequence_number integer
)
returns date
language sql
immutable
set search_path = ''
as $$
  select case
    when sequence_number <= 100 then date '2025-01-01'
    when sequence_number <= 145 then
      date '2025-01-02'
      + floor((sequence_number - 101) * 179.0 / 44.0)::integer
    when sequence_number <= 183 then
      date '2025-07-01'
      + floor((sequence_number - 146) * 183.0 / 37.0)::integer
    when sequence_number <= 218 then
      date '2026-01-01'
      + floor((sequence_number - 184) * 89.0 / 34.0)::integer
    when sequence_number <= 256 then
      date '2026-04-01'
      + floor((sequence_number - 219) * 90.0 / 37.0)::integer
    else date '2026-07-01' + ((sequence_number - 257) * 3)
  end
$$;

revoke all on function private.scenario_v7_workforce_start_date(integer)
from public, anon, authenticated;

create or replace function private.generate_demo_scenario_v7_interval(
  target_organization_id uuid,
  actor_profile_id uuid,
  interval_from date,
  interval_through date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_people integer;
  generated_people integer := 0;
  generated_tasks integer := 0;
  generated_leave integer := 0;
  generated_incidents integer := 0;
  generated_treasury integer := 0;
  generated_payroll integer := 0;
  generated_integrations integer := 0;
  existing_people integer := 0;
begin
  if target_organization_id is null
    or actor_profile_id is null
    or interval_from is null
    or interval_through is null
    or interval_from > interval_through
  then
    raise exception 'invalid scenario interval';
  end if;

  perform 1
  from public.organizations organization
  where organization.id = target_organization_id
  for update;

  target_people := case
    when interval_through < date '2025-01-01' then 0
    when interval_through <= date '2025-06-30' then
      100 + round(
        (interval_through - date '2025-01-01') * 45.0 / 180.0
      )::integer
    when interval_through <= date '2025-12-31' then
      145 + round(
        (interval_through - date '2025-06-30') * 38.0 / 184.0
      )::integer
    when interval_through <= date '2026-03-31' then
      183 + round(
        (interval_through - date '2025-12-31') * 35.0 / 90.0
      )::integer
    when interval_through <= date '2026-06-30' then
      218 + round(
        (interval_through - date '2026-03-31') * 38.0 / 91.0
      )::integer
    else least(266, 256 + floor((interval_through - date '2026-07-01') / 3.0)::integer)
  end;

  select count(*)
  into existing_people
  from public.people person
  where person.organization_id = target_organization_id;

  insert into public.people (
    id, organization_id, display_name, team, position_title, status,
    role_code, employment_contract_type, employment_start_date,
    employment_end_date, created_at, updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'person-v7', item),
    target_organization_id,
    'Persona sintética ' || lpad(item::text, 3, '0'),
    (array[
      'Operaciones', 'Producto', 'Tecnología',
      'Atención', 'Finanzas', 'Personas'
    ])[1 + mod(item - 1, 6)],
    case when mod(item, 9) = 1 then 'Responsable de equipo'
      else 'Especialista de operaciones'
    end,
    case
      when item in (40, 41, 42, 50, 51, 52) then 'inactive'
      else 'active'
    end::public.person_status,
    case when mod(item, 9) = 1 then 'manager'
      else 'employee'
    end::public.person_role_code,
    case
      when mod(item, 16) = 0 then 'temporary_substitution'
      when mod(item, 11) = 0 then 'temporary_production'
      when mod(item, 9) = 0 then 'permanent_discontinuous'
      else 'indefinite_ordinary'
    end,
    private.scenario_v7_workforce_start_date(item),
    case
      when item in (40, 41, 42) then
        date '2025-08-06' + ((item - 40) * 9)
      when item in (50, 51, 52) then
        date '2026-04-06' + ((item - 50) * 8)
      else null
    end,
    private.scenario_v7_workforce_start_date(item) + time '09:00',
    private.scenario_v7_workforce_start_date(item) + time '09:00'
  from generate_series(1, target_people) item
  where item > existing_people
    and private.scenario_v7_workforce_start_date(item) <= interval_through
  on conflict (id) do nothing;
  get diagnostics generated_people = row_count;

  with months as (
    select month_start::date,
      greatest(interval_from, month_start::date) as effective_from,
      least(
        interval_through,
        (month_start + interval '1 month - 1 day')::date
      ) as effective_through
    from generate_series(
      date_trunc('month', interval_from)::date,
      date_trunc('month', interval_through)::date,
      interval '1 month'
    ) month_start
  ),
  targets as (
    select months.*,
      greatest(1, round(
        (
          select count(*)::numeric
          from public.people person
          where person.organization_id = target_organization_id
            and person.employment_start_date <= months.effective_through
            and (
              person.employment_end_date is null
              or person.employment_end_date >= months.effective_from
            )
        ) * 0.30
        * (months.effective_through - months.effective_from + 1)
        / extract(day from (months.month_start + interval '1 month - 1 day'))
      ))::integer as row_count
    from months
  ),
  rows as (
    select target.*, item
    from targets target
    cross join lateral generate_series(1, target.row_count) item
  )
  insert into public.tasks (
    id, organization_id, title, description, status, priority,
    project_id, assignee_person_id, created_by, due_date,
    created_at, updated_at
  )
  select
    private.demo_uuid(
      target_organization_id,
      'task-v7-' || to_char(row.month_start, 'YYYY-MM'),
      row.item
    ),
    target_organization_id,
    'Tarea operativa ' || to_char(row.month_start, 'YYYY-MM')
      || '-' || lpad(row.item::text, 3, '0'),
    'Actividad sintética planificada para la demostración pública.',
    case
      when row.effective_through < interval_through - 45 then
        case when mod(row.item, 8) = 0 then 'in_review' else 'completed' end
      else (array[
        'completed', 'completed', 'completed', 'completed',
        'completed', 'completed', 'completed', 'pending'
      ])[1 + mod(row.item - 1, 8)]
    end::public.task_status,
    (array['low', 'medium', 'medium', 'high'])
      [1 + mod(row.item - 1, 4)]::public.task_priority,
    (
      select project.id
      from public.projects project
      where project.organization_id = target_organization_id
      order by project.code, project.id
      offset mod(row.item - 1, greatest(1, (
        select count(*) from public.projects project_count
        where project_count.organization_id = target_organization_id
      )))
      limit 1
    ),
    (
      select person.id
      from public.people person
      where person.organization_id = target_organization_id
        and person.employment_start_date <= row.effective_through
        and (
          person.employment_end_date is null
          or person.employment_end_date >= row.effective_from
        )
      order by person.display_name, person.id
      offset mod(row.item - 1, greatest(1, (
        select count(*) from public.people person_count
        where person_count.organization_id = target_organization_id
          and person_count.employment_start_date <= row.effective_through
          and (
            person_count.employment_end_date is null
            or person_count.employment_end_date >= row.effective_from
          )
      )))
      limit 1
    ),
    actor_profile_id,
    row.effective_from + least(
      row.effective_through - row.effective_from,
      mod(row.item * 3, greatest(1, row.effective_through - row.effective_from + 1))
    ) + 10,
    row.effective_from + least(
      row.effective_through - row.effective_from,
      mod(row.item * 3, greatest(1, row.effective_through - row.effective_from + 1))
    ) + time '09:00',
    row.effective_from + least(
      row.effective_through - row.effective_from,
      mod(row.item * 3, greatest(1, row.effective_through - row.effective_from + 1))
    ) + time '16:00'
  from rows row
  on conflict (id) do nothing;
  get diagnostics generated_tasks = row_count;

  with months as (
    select month_start::date,
      greatest(interval_from, month_start::date) as effective_from,
      least(interval_through, (month_start + interval '1 month - 1 day')::date)
        as effective_through
    from generate_series(
      date_trunc('month', interval_from)::date,
      date_trunc('month', interval_through)::date,
      interval '1 month'
    ) month_start
  ),
  targets as (
    select months.*,
      greatest(1, round(
        (
          select count(*)::numeric
          from public.people person
          where person.organization_id = target_organization_id
            and person.employment_start_date <= months.effective_through
            and (
              person.employment_end_date is null
              or person.employment_end_date >= months.effective_from
            )
        ) * 0.035
        * case
            when extract(month from months.month_start) in (7, 8) then 2.0
            when extract(month from months.month_start) = 12 then 1.6
            else 1.0
          end
        * (months.effective_through - months.effective_from + 1)
        / extract(day from (months.month_start + interval '1 month - 1 day'))
      ))::integer as row_count
    from months
  ),
  rows as (
    select target.*, item
    from targets target
    cross join lateral generate_series(1, target.row_count) item
  )
  insert into public.leave_requests (
    id, organization_id, profile_id, person_id, start_date, end_date,
    leave_type, reason, status, created_at, updated_at
  )
  select
    private.demo_uuid(
      target_organization_id,
      'leave-v7-' || to_char(row.month_start, 'YYYY-MM'),
      row.item
    ),
    target_organization_id,
    actor_profile_id,
    person.id,
    row.effective_from + least(
      row.effective_through - row.effective_from,
      mod(row.item * 7, greatest(1, row.effective_through - row.effective_from + 1))
    ),
    least(
      interval_through,
      row.effective_from + least(
        row.effective_through - row.effective_from,
        mod(row.item * 7, greatest(1, row.effective_through - row.effective_from + 1))
      ) + (1 + mod(row.item, 4))
    ),
    case when mod(row.item, 5) = 0 then 'personal'
      else 'vacation'
    end::public.leave_type,
    'Ausencia sintética planificada.',
    case
      when row.effective_through < interval_through - 35 then 'approved'
      when mod(row.item, 3) = 0 then 'draft'
      else 'submitted'
    end::public.leave_request_status,
    row.effective_from + time '08:00',
    row.effective_from + time '10:00'
  from rows row
  cross join lateral (
    select candidate.id
    from public.people candidate
    where candidate.organization_id = target_organization_id
      and candidate.employment_start_date <= row.effective_through
      and (
        candidate.employment_end_date is null
        or candidate.employment_end_date >= row.effective_from
      )
    order by candidate.team, candidate.display_name, candidate.id
    offset mod(row.item * 7, greatest(1, (
      select count(*) from public.people person_count
      where person_count.organization_id = target_organization_id
        and person_count.employment_start_date <= row.effective_through
        and (
          person_count.employment_end_date is null
          or person_count.employment_end_date >= row.effective_from
        )
    )))
    limit 1
  ) person
  on conflict (id) do nothing;
  get diagnostics generated_leave = row_count;

  with months as (
    select month_start::date,
      greatest(interval_from, month_start::date) as effective_from,
      least(interval_through, (month_start + interval '1 month - 1 day')::date)
        as effective_through
    from generate_series(
      date_trunc('month', interval_from)::date,
      date_trunc('month', interval_through)::date,
      interval '1 month'
    ) month_start
  ),
  targets as (
    select months.*,
      greatest(2, round(
        (
          select count(*)::numeric
          from public.people person
          where person.organization_id = target_organization_id
            and person.employment_start_date <= months.effective_through
            and (
              person.employment_end_date is null
              or person.employment_end_date >= months.effective_from
            )
        ) * 0.02
        * (months.effective_through - months.effective_from + 1)
        / extract(day from (months.month_start + interval '1 month - 1 day'))
      ))::integer as row_count
    from months
  ),
  rows as (
    select target.*, item
    from targets target
    cross join lateral generate_series(1, target.row_count) item
  )
  insert into public.incidents (
    id, organization_id, reference, title, description, status, priority,
    category, affected_service, analytics_service_code, impact_scope,
    detection_channel, requester_profile_id, requester_person_id,
    assignee_person_id, sla_due_at, resolution, created_at, updated_at
  )
  select
    private.demo_uuid(
      target_organization_id,
      'incident-v7-' || to_char(row.month_start, 'YYYY-MM'),
      row.item
    ),
    target_organization_id,
    'INC-V7-' || to_char(row.month_start, 'YYYYMM') || '-'
      || lpad(row.item::text, 3, '0'),
    'Incidencia operativa sintética',
    'Caso sintético sin datos personales ni información confidencial.',
    case
      when row.effective_through < interval_through - 45 then 'closed'
      when mod(row.item, 3) = 0 then 'investigating'
      else 'resolved'
    end::public.incident_status,
    (array['low', 'medium', 'high', 'critical'])
      [1 + mod(row.item - 1, 4)]::public.incident_priority,
    (array['access', 'data', 'hardware', 'software', 'other'])
      [1 + mod(row.item - 1, 5)]::public.incident_category,
    service.label,
    service.code,
    (array['individual', 'team', 'workspace'])
      [1 + mod(row.item - 1, 3)],
    (array['monitoring', 'support', 'team', 'automation'])
      [1 + mod(row.item - 1, 4)],
    actor_profile_id,
    requester.id,
    requester.id,
    row.effective_from + mod(
      row.item * 5,
      greatest(1, row.effective_through - row.effective_from + 1)
    ) + time '18:00',
    case when row.effective_through < interval_through - 45
      then 'Resolución sintética validada.' else null end,
    row.effective_from + mod(
      row.item * 5,
      greatest(1, row.effective_through - row.effective_from + 1)
    ) + time '09:00',
    row.effective_from + mod(
      row.item * 5,
      greatest(1, row.effective_through - row.effective_from + 1)
    ) + time '15:00'
  from rows row
  cross join lateral (
    select dimension.code, dimension.label
    from public.analytics_service_dimensions dimension
    where dimension.organization_id = target_organization_id
      and dimension.kind = 'incident'
    order by dimension.code
    offset mod(row.item - 1, 6)
    limit 1
  ) service
  cross join lateral (
    select person.id
    from public.people person
    where person.organization_id = target_organization_id
      and person.employment_start_date <= row.effective_through
      and (
        person.employment_end_date is null
        or person.employment_end_date >= row.effective_from
      )
    order by person.display_name, person.id
    offset mod(row.item - 1, greatest(1, (
      select count(*) from public.people person_count
      where person_count.organization_id = target_organization_id
        and person_count.employment_start_date <= row.effective_through
        and (
          person_count.employment_end_date is null
          or person_count.employment_end_date >= row.effective_from
        )
    )))
    limit 1
  ) requester
  on conflict (id) do nothing;
  get diagnostics generated_incidents = row_count;

  with months as (
    select month_start::date,
      greatest(interval_from, month_start::date) as effective_from,
      least(interval_through, (month_start + interval '1 month - 1 day')::date)
        as effective_through
    from generate_series(
      date_trunc('month', interval_from)::date,
      date_trunc('month', interval_through)::date,
      interval '1 month'
    ) month_start
  ),
  targets as (
    select months.*,
      greatest(20, round(
        (
          select count(*)::numeric
          from public.people person
          where person.organization_id = target_organization_id
            and person.employment_start_date <= months.effective_through
            and (
              person.employment_end_date is null
              or person.employment_end_date >= months.effective_from
            )
        ) * 0.10
      ))::integer as month_count
    from months
  ),
  rows as (
    select target.*, item
    from targets target
    cross join lateral generate_series(
      1,
      greatest(1, round(
        target.month_count
        * (target.effective_through - target.effective_from + 1)
        / extract(day from (target.month_start + interval '1 month - 1 day'))
      )::integer)
    ) item
  )
  insert into public.treasury_entries (
    id, organization_id, entry_date, concept, category, source,
    amount_cents, currency, status, created_by, created_at, updated_at
  )
  select
    private.demo_uuid(
      target_organization_id,
      'treasury-v7-' || to_char(row.month_start, 'YYYY-MM'),
      row.item
    ),
    target_organization_id,
    row.effective_from + mod(
      row.item * 2,
      greatest(1, row.effective_through - row.effective_from + 1)
    ),
    case when mod(row.item, 3) = 0
      then 'Cobro por servicios' else 'Pago operativo' end,
    case when mod(row.item, 3) = 0
      then 'income' else 'operations' end,
    'Scenario V7',
    case when mod(row.item, 3) = 0
      then 1000000
      else -430000
    end,
    'EUR',
    'closed'::public.treasury_entry_status,
    actor_profile_id,
    row.effective_from + time '07:00',
    row.effective_from + time '07:30'
  from rows row
  on conflict (id) do nothing;
  get diagnostics generated_treasury = row_count;

  insert into public.payroll_runs (
    id, organization_id, period_start, period_end, people_count,
    gross_total_cents, deduction_total_cents, currency, notes, status,
    created_by, created_at, updated_at
  )
  select
    private.demo_uuid(
      target_organization_id,
      'payroll-v7-' || to_char(month_start::date, 'YYYY-MM'),
      1
    ),
    target_organization_id,
    month_start::date,
    least(
      interval_through,
      (month_start + interval '1 month - 1 day')::date
    ),
    (
      select count(*)
      from public.people person
      where person.organization_id = target_organization_id
        and person.employment_start_date <= least(
          interval_through,
          (month_start + interval '1 month - 1 day')::date
        )
        and (
          person.employment_end_date is null
          or person.employment_end_date >= month_start::date
        )
    ),
    (
      select count(*) * 285000
      from public.people person
      where person.organization_id = target_organization_id
        and person.employment_start_date <= least(
          interval_through,
          (month_start + interval '1 month - 1 day')::date
        )
        and (
          person.employment_end_date is null
          or person.employment_end_date >= month_start::date
        )
    ),
    (
      select count(*) * 57000
      from public.people person
      where person.organization_id = target_organization_id
        and person.employment_start_date <= least(
          interval_through,
          (month_start + interval '1 month - 1 day')::date
        )
        and (
          person.employment_end_date is null
          or person.employment_end_date >= month_start::date
        )
    ),
    'EUR',
    'Ciclo agregado sin retribuciones individuales.',
    case
      when (month_start + interval '1 month - 1 day')::date < interval_through
        then 'closed'
      else 'validating'
    end::public.payroll_run_status,
    actor_profile_id,
    month_start::date + time '08:00',
    least(
      interval_through,
      (month_start + interval '1 month - 1 day')::date
    ) + time '12:00'
  from generate_series(
    date_trunc('month', interval_from)::date,
    date_trunc('month', interval_through)::date,
    interval '1 month'
  ) month_start
  on conflict (id) do nothing;
  get diagnostics generated_payroll = row_count;

  insert into public.integration_runs (
    id, organization_id, connector_id, effective_date, status, trigger_kind,
    source_sequence, processed_count, imported_count, duplicate_count,
    error_count, safe_summary, started_at, finished_at, created_by, created_at
  )
  select
    private.demo_uuid(
      target_organization_id,
      'integration-v7-' || to_char(month_start::date, 'YYYY-MM'),
      connector.row_number
    ),
    target_organization_id,
    connector.id,
    least(
      interval_through,
      greatest(interval_from, month_start::date + 6 + connector.row_number * 5)
    ),
    case
      when mod(connector.row_number, 17) = 0 then 'failed'
      when mod(connector.row_number, 7) = 0 then 'partial'
      else 'succeeded'
    end::public.integration_run_status,
    'schedule',
    extract(year from month_start)::integer * 100
      + extract(month from month_start)::integer,
    greatest(1, round(connector.active_people * 0.30))::integer,
    greatest(1, round(connector.active_people * 0.30))::integer
      - case when mod(connector.row_number, 7) = 0 then 1 else 0 end,
    0,
    case when mod(connector.row_number, 7) = 0 then 1 else 0 end,
    'Ejecución programada sintética revisada.',
    least(
      interval_through,
      greatest(interval_from, month_start::date + 6 + connector.row_number * 5)
    ) + time '02:15',
    least(
      interval_through,
      greatest(interval_from, month_start::date + 6 + connector.row_number * 5)
    ) + time '03:00',
    actor_profile_id,
    least(
      interval_through,
      greatest(interval_from, month_start::date + 6 + connector.row_number * 5)
    ) + time '02:00'
  from generate_series(
    date_trunc('month', interval_from)::date,
    date_trunc('month', interval_through)::date,
    interval '1 month'
  ) month_start
  cross join lateral (
    select ranked.id, ranked.row_number, (
      select count(*)
      from public.people person
      where person.organization_id = target_organization_id
        and person.employment_start_date <= least(
          interval_through,
          (month_start + interval '1 month - 1 day')::date
        )
        and (
          person.employment_end_date is null
          or person.employment_end_date >= month_start::date
        )
    ) as active_people
    from (
      select connector.id,
        row_number() over (order by connector.code)::integer as row_number
      from public.integration_connectors connector
      where connector.organization_id = target_organization_id
      order by connector.code
      limit 4
    ) ranked
  ) connector
  on conflict (id) do nothing;
  get diagnostics generated_integrations = row_count;

  return jsonb_build_object(
    'people', generated_people,
    'tasks', generated_tasks,
    'leaveRequests', generated_leave,
    'incidents', generated_incidents,
    'treasuryEntries', generated_treasury,
    'payrollRuns', generated_payroll,
    'integrationRuns', generated_integrations
  );
end;
$$;

revoke all on function private.generate_demo_scenario_v7_interval(
  uuid, uuid, date, date
) from public, anon, authenticated;

create or replace function public.ensure_demo_scenario_current(
  expected_organization_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_through date;
  target_through date := timezone('Europe/Madrid', now())::date - 1;
  generated_counts jsonb := '{}'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if expected_organization_id is null
    or not private.is_org_member(expected_organization_id)
  then
    raise exception 'permission denied';
  end if;

  select organization.scenario_generated_through_date
  into generated_through
  from public.organizations organization
  where organization.id = expected_organization_id
  for update;

  if generated_through is null then
    raise exception 'organization not found';
  end if;

  if generated_through >= target_through then
    return jsonb_build_object(
      'from', generated_through,
      'through', generated_through,
      'generated', false,
      'counts', '{}'::jsonb
    );
  end if;

  generated_counts := private.generate_demo_scenario_v7_interval(
    expected_organization_id,
    auth.uid(),
    generated_through + 1,
    target_through
  );

  update public.organizations
  set scenario_version = 7,
      scenario_anchor_date = target_through,
      scenario_generated_through_date = target_through,
      updated_at = now()
  where id = expected_organization_id;

  insert into public.scenario_evolution_events (
    id, organization_id, event_date, event_type,
    from_date, through_date, generated_counts
  )
  values (
    private.demo_uuid(
      expected_organization_id,
      'scenario-v7-' || target_through::text,
      1
    ),
    expected_organization_id,
    target_through,
    'generated',
    generated_through + 1,
    target_through,
    generated_counts
  )
  on conflict (organization_id, event_date, event_type) do nothing;

  insert into public.audit_events (
    organization_id, actor_profile_id, event_type,
    entity_type, entity_id, metadata
  )
  values (
    expected_organization_id,
    auth.uid(),
    'demo.scenario.v7_extended',
    'demo_scenario',
    expected_organization_id,
    jsonb_build_object(
      'scenario_version', 7,
      'from', generated_through + 1,
      'through', target_through,
      'counts', generated_counts,
      'synthetic_only', true
    )
  );

  return jsonb_build_object(
    'from', generated_through + 1,
    'through', target_through,
    'generated', true,
    'counts', generated_counts
  );
end;
$$;

revoke all on function public.ensure_demo_scenario_current(uuid)
from public, anon;
grant execute on function public.ensure_demo_scenario_current(uuid)
to authenticated;

create or replace function public.get_analytics_snapshot(
  expected_organization_id uuid,
  filter_period text,
  filter_project_id uuid default null,
  filter_team text default null,
  filter_owner_id uuid default null,
  filter_status text default null,
  filter_service text default null,
  target_view text default 'executive'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_to date := timezone('Europe/Madrid', now())::date - 1;
  current_from date;
  previous_from date;
  previous_to date;
  window_days integer;
  service_kind text;
begin
  if auth.uid() is null
    or expected_organization_id is null
    or not private.is_org_member(expected_organization_id)
  then
    raise exception 'permission denied';
  end if;

  if filter_period not in ('all', '30d', '90d', '6m', '12m')
    or target_view not in ('executive', 'work', 'people', 'service', 'finance')
  then
    raise exception 'unsupported analytics request';
  end if;

  current_from := case filter_period
    when '30d' then current_to - 29
    when '90d' then current_to - 89
    when '6m' then (current_to - interval '6 months' + interval '1 day')::date
    when '12m' then (current_to - interval '12 months' + interval '1 day')::date
    else date '2025-01-01'
  end;
  window_days := current_to - current_from + 1;
  previous_to := current_from - 1;
  previous_from := previous_to - window_days + 1;

  select dimension.kind
  into service_kind
  from public.analytics_service_dimensions dimension
  where dimension.organization_id = expected_organization_id
    and dimension.code = filter_service;

  return (
  with
  task_base as (
    select
      task.id,
      task.status::text as status,
      task.project_id,
      task.assignee_person_id,
      coalesce(task.due_date, current_to) as due_date,
      case when task.status = 'completed'::public.task_status
        then task.updated_at::date else task.created_at::date end as event_date
    from public.tasks task
    left join public.people assignee on assignee.id = task.assignee_person_id
    where task.organization_id = expected_organization_id
      and (filter_project_id is null or task.project_id = filter_project_id)
      and (filter_team is null or assignee.team = filter_team)
      and (filter_owner_id is null or task.assignee_person_id = filter_owner_id)
      and (filter_status is null or task.status::text = filter_status)
  ),
  incident_base as (
    select
      incident.id,
      incident.status::text as status,
      incident.priority::text as priority,
      incident.affected_service,
      incident.analytics_service_code,
      incident.project_id,
      incident.assignee_person_id,
      incident.sla_due_at::date as sla_due_date,
      incident.created_at::date as event_date
    from public.incidents incident
    left join public.people assignee
      on assignee.id = incident.assignee_person_id
    where incident.organization_id = expected_organization_id
      and (
        filter_project_id is null
        or incident.project_id = filter_project_id
      )
      and (filter_team is null or assignee.team = filter_team)
      and (
        filter_owner_id is null
        or incident.assignee_person_id = filter_owner_id
      )
      and (filter_status is null or incident.status::text = filter_status)
      and (
        filter_service is null
        or service_kind <> 'incident'
        or incident.analytics_service_code = filter_service
      )
  ),
  people_base as (
    select person.*
    from public.people person
    where person.organization_id = expected_organization_id
      and (filter_team is null or person.team = filter_team)
      and (filter_owner_id is null or person.id = filter_owner_id)
  ),
  leave_base as (
    select request.*, person.team
    from public.leave_requests request
    join public.people person on person.id = request.person_id
    where request.organization_id = expected_organization_id
      and (filter_team is null or person.team = filter_team)
      and (filter_owner_id is null or request.person_id = filter_owner_id)
  ),
  run_base as (
    select run.*
    from public.integration_runs run
    join public.integration_connectors connector
      on connector.id = run.connector_id
    where run.organization_id = expected_organization_id
      and (
        filter_service is null
        or service_kind <> 'integration'
        or connector.code = filter_service
      )
  ),
  kpi_rows as (
    select *
    from (
      values
        (
          'projects_at_risk',
          'Proyectos en riesgo',
          'count',
          'decrease',
          'proyectos activos',
          null::numeric,
          (
            select count(*)::numeric
            from public.projects project
            where project.organization_id = expected_organization_id
              and project.status = 'active'::public.project_status
              and project.health <> 'on_track'::public.project_health
              and (
                filter_project_id is null
                or project.id = filter_project_id
              )
          ),
          null::numeric,
          array['executive', 'work']
        ),
        (
          'overdue_work',
          'Trabajo vencido',
          'count',
          'decrease',
          'tareas abiertas',
          null::numeric,
          (
            select count(*)::numeric from task_base
            where event_date between current_from and current_to
              and status <> 'completed' and due_date < current_to
          ),
          (
            select count(*)::numeric from task_base
            where event_date between previous_from and previous_to
              and status <> 'completed' and due_date < previous_to
          ),
          array['executive', 'work']
        ),
        (
          'completed_tasks',
          'Tareas completadas',
          'count',
          'increase',
          'en el periodo',
          null::numeric,
          (
            select count(*)::numeric from task_base
            where event_date between current_from and current_to
              and status = 'completed'
          ),
          (
            select count(*)::numeric from task_base
            where event_date between previous_from and previous_to
              and status = 'completed'
          ),
          array['work']
        ),
        (
          'blocked_tasks',
          'Trabajo bloqueado',
          'count',
          'decrease',
          'requiere atención',
          null::numeric,
          (
            select count(*)::numeric from task_base
            where event_date between current_from and current_to
              and status = 'blocked'
          ),
          (
            select count(*)::numeric from task_base
            where event_date between previous_from and previous_to
              and status = 'blocked'
          ),
          array['work']
        ),
        (
          'active_people',
          'Personas activas',
          'count',
          'neutral',
          'en la organización',
          null::numeric,
          (
            select count(*)::numeric from people_base person
            where person.employment_start_date <= current_to
              and (
                person.employment_end_date is null
                or person.employment_end_date >= current_to
              )
          ),
          null::numeric,
          array['people']
        ),
        (
          'available_capacity',
          'Capacidad disponible',
          'count',
          'neutral',
          'sin ausencia actual',
          null::numeric,
          (
            select count(*)::numeric
            from people_base person
            where person.employment_start_date <= current_to
              and (
                person.employment_end_date is null
                or person.employment_end_date >= current_to
              )
              and not exists (
                select 1 from leave_base request
                where request.person_id = person.id
                  and request.status = 'approved'
                    ::public.leave_request_status
                  and current_to between request.start_date and request.end_date
              )
          ),
          null::numeric,
          array['executive', 'people']
        ),
        (
          'approved_leave',
          'Ausencias aprobadas',
          'count',
          'neutral',
          'en el periodo',
          null::numeric,
          (
            select count(*)::numeric from leave_base
            where status = 'approved'::public.leave_request_status
              and start_date between current_from and current_to
          ),
          (
            select count(*)::numeric from leave_base
            where status = 'approved'::public.leave_request_status
              and start_date between previous_from and previous_to
          ),
          array['people']
        ),
        (
          'teams',
          'Equipos',
          'count',
          'neutral',
          'unidades operativas',
          null::numeric,
          (select count(distinct team)::numeric from people_base),
          null::numeric,
          array['people']
        ),
        (
          'incident_backlog',
          'Incidencias pendientes',
          'count',
          'decrease',
          'casos abiertos',
          null::numeric,
          (
            select count(*)::numeric from incident_base
            where event_date between current_from and current_to
              and status not in ('resolved', 'closed')
          ),
          (
            select count(*)::numeric from incident_base
            where event_date between previous_from and previous_to
              and status not in ('resolved', 'closed')
          ),
          array['service']
        ),
        (
          'sla_compliance',
          'Cumplimiento SLA',
          'percentage',
          'increase',
          'objetivo 92 %',
          92::numeric,
          (
            select case when count(*) = 0 then 100
              else 100.0 * count(*) filter (
                where status in ('resolved', 'closed')
                  or sla_due_date >= current_to
              ) / count(*) end
            from incident_base
            where event_date between current_from and current_to
          ),
          (
            select case when count(*) = 0 then 100
              else 100.0 * count(*) filter (
                where status in ('resolved', 'closed')
                  or sla_due_date >= previous_to
              ) / count(*) end
            from incident_base
            where event_date between previous_from and previous_to
          ),
          array['executive', 'service']
        ),
        (
          'critical_incidents',
          'Críticas',
          'count',
          'decrease',
          'prioridad máxima',
          null::numeric,
          (
            select count(*)::numeric from incident_base
            where event_date between current_from and current_to
              and priority = 'critical'
          ),
          (
            select count(*)::numeric from incident_base
            where event_date between previous_from and previous_to
              and priority = 'critical'
          ),
          array['service']
        ),
        (
          'investigating_incidents',
          'En investigación',
          'count',
          'decrease',
          'casos activos',
          null::numeric,
          (
            select count(*)::numeric from incident_base
            where event_date between current_from and current_to
              and status = 'investigating'
          ),
          (
            select count(*)::numeric from incident_base
            where event_date between previous_from and previous_to
              and status = 'investigating'
          ),
          array['service']
        ),
        (
          'cash_balance',
          'Saldo del periodo',
          'currency',
          'increase',
          'entradas menos salidas',
          null::numeric,
          (
            select coalesce(sum(amount_cents), 0)::numeric
            from public.treasury_entries
            where organization_id = expected_organization_id
              and entry_date between current_from and current_to
          ),
          (
            select coalesce(sum(amount_cents), 0)::numeric
            from public.treasury_entries
            where organization_id = expected_organization_id
              and entry_date between previous_from and previous_to
          ),
          array['finance']
        ),
        (
          'cash_margin',
          'Margen operativo',
          'percentage',
          'increase',
          'objetivo 10–18 %',
          12::numeric,
          (
            select case
              when coalesce(sum(amount_cents) filter (where amount_cents > 0), 0) = 0
                then 0
              else 100.0 * sum(amount_cents)
                / sum(amount_cents) filter (where amount_cents > 0)
              end
            from public.treasury_entries
            where organization_id = expected_organization_id
              and entry_date between current_from and current_to
          ),
          (
            select case
              when coalesce(sum(amount_cents) filter (where amount_cents > 0), 0) = 0
                then 0
              else 100.0 * sum(amount_cents)
                / sum(amount_cents) filter (where amount_cents > 0)
              end
            from public.treasury_entries
            where organization_id = expected_organization_id
              and entry_date between previous_from and previous_to
          ),
          array['executive', 'finance']
        ),
        (
          'payroll_cost',
          'Coste empresa',
          'currency',
          'neutral',
          'último ciclo del periodo',
          null::numeric,
          coalesce((
            select employer_cost_total_cents::numeric
            from public.payroll_runs
            where organization_id = expected_organization_id
              and period_start between current_from and current_to
            order by period_start desc limit 1
          ), 0),
          coalesce((
            select employer_cost_total_cents::numeric
            from public.payroll_runs
            where organization_id = expected_organization_id
              and period_start between previous_from and previous_to
            order by period_start desc limit 1
          ), 0),
          array['finance']
        ),
        (
          'integration_success',
          'Éxito de integraciones',
          'percentage',
          'increase',
          'ejecuciones del periodo',
          95::numeric,
          (
            select case when count(*) = 0 then 0
              else 100.0 * count(*) filter (where status = 'succeeded')
                / count(*) end
            from run_base
            where effective_date between current_from and current_to
              and status in ('succeeded', 'partial', 'failed')
          ),
          (
            select case when count(*) = 0 then 0
              else 100.0 * count(*) filter (where status = 'succeeded')
                / count(*) end
            from run_base
            where effective_date between previous_from and previous_to
              and status in ('succeeded', 'partial', 'failed')
          ),
          array['executive', 'finance']
        )
    ) as row(
      code, label, unit, direction, context, target,
      current_value, previous_value, views
    )
    where target_view = any(views)
  ),
  series_rows as (
    select 'completed_tasks_monthly' as code,
      'Tareas completadas por mes' as label, 'count' as unit,
      to_char(event_date, 'YYYY-MM') as period, count(*)::numeric as value
    from task_base
    where target_view = 'executive'
      and status = 'completed'
      and event_date between current_from and current_to
    group by to_char(event_date, 'YYYY-MM')
    union all
    select 'incidents_monthly', 'Incidencias registradas por mes', 'count',
      to_char(event_date, 'YYYY-MM'), count(*)::numeric
    from incident_base
    where target_view = 'executive'
      and event_date between current_from and current_to
    group by to_char(event_date, 'YYYY-MM')
    union all
    select 'tasks_by_status', 'Tareas por estado', 'count',
      status, count(*)::numeric
    from task_base
    where target_view = 'work'
      and event_date between current_from and current_to
    group by status
    union all
    select 'tasks_by_project', 'Tareas por proyecto', 'count',
      coalesce(project.name, 'Sin proyecto'), count(*)::numeric
    from task_base task
    left join public.projects project on project.id = task.project_id
    where target_view = 'work'
      and task.event_date between current_from and current_to
    group by coalesce(project.name, 'Sin proyecto')
    union all
    select 'leave_by_month', 'Ausencias aprobadas por mes', 'count',
      to_char(start_date, 'YYYY-MM'), count(*)::numeric
    from leave_base
    where target_view = 'people'
      and status = 'approved'::public.leave_request_status
      and start_date between current_from and current_to
    group by to_char(start_date, 'YYYY-MM')
    union all
    select 'people_by_team', 'Personas activas por equipo', 'count',
      team, count(*)::numeric
    from people_base
    where target_view = 'people'
      and employment_start_date <= current_to
      and (employment_end_date is null or employment_end_date >= current_to)
    group by team
    union all
    select 'incidents_by_status', 'Incidencias por estado', 'count',
      status, count(*)::numeric
    from incident_base
    where target_view = 'service'
      and event_date between current_from and current_to
    group by status
    union all
    select 'incidents_by_service', 'Incidencias por servicio', 'count',
      affected_service, count(*)::numeric
    from incident_base
    where target_view = 'service'
      and event_date between current_from and current_to
    group by affected_service
    union all
    select 'cash_balance_monthly', 'Saldo por mes', 'currency',
      to_char(entry_date, 'YYYY-MM'), sum(amount_cents)::numeric
    from public.treasury_entries
    where target_view = 'finance'
      and organization_id = expected_organization_id
      and entry_date between current_from and current_to
    group by to_char(entry_date, 'YYYY-MM')
    union all
    select 'payroll_cost_monthly', 'Coste de nómina por mes', 'currency',
      to_char(period_start, 'YYYY-MM'),
      sum(employer_cost_total_cents)::numeric
    from public.payroll_runs
    where target_view = 'finance'
      and organization_id = expected_organization_id
      and period_start between current_from and current_to
    group by to_char(period_start, 'YYYY-MM')
  ),
  series_groups as (
    select code, label, unit,
      jsonb_agg(
        jsonb_build_object('period', period, 'value', value)
        order by period
      ) as points
    from series_rows
    group by code, label, unit
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'filters', jsonb_build_object(
      'period', filter_period,
      'comparison', 'previous_period',
      'projectId', filter_project_id,
      'team', filter_team,
      'ownerId', filter_owner_id,
      'status', filter_status,
      'service', filter_service
    ),
    'window', jsonb_build_object(
      'current', jsonb_build_object('from', current_from, 'to', current_to),
      'previous', jsonb_build_object('from', previous_from, 'to', previous_to)
    ),
    'kpis', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', code,
        'label', label,
        'value', coalesce(current_value, 0),
        'unit', unit,
        'variation', case
          when previous_value is null or previous_value = 0 then null
          else 100.0 * (current_value - previous_value)
            / abs(previous_value)
        end,
        'target', target,
        'sparkline', case when previous_value is null
          then jsonb_build_array(coalesce(current_value, 0))
          else jsonb_build_array(previous_value, coalesce(current_value, 0))
        end,
        'favorableDirection', direction,
        'context', context,
        'hasData', true
      )) from kpi_rows
    ), '[]'::jsonb),
    'series', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', code, 'label', label, 'unit', unit, 'points', points
      )) from series_groups
    ), '[]'::jsonb),
    'alerts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', 'alert-' || code,
        'severity', case
          when code = 'sla_compliance' then 'critical' else 'warning' end,
        'title', label,
        'value', current_value,
        'unit', unit,
        'context', context,
        'targetModule', case
          when code = 'sla_compliance' then 'incidencias' else 'tareas' end
      ))
      from kpi_rows
      where (code = 'sla_compliance' and current_value < 92)
         or (code = 'overdue_work' and current_value > 0)
    ), '[]'::jsonb)
  ));
end;
$$;

revoke all on function public.get_analytics_snapshot(
  uuid, text, uuid, text, uuid, text, text, text
) from public, anon;
grant execute on function public.get_analytics_snapshot(
  uuid, text, uuid, text, uuid, text, text, text
) to authenticated;

-- Correct only known mojibake sequences in synthetic/demo copy.
update public.changelog_entries
set title = replace(replace(replace(replace(
      title, 'Ãƒ', 'í'), 'Ã‚', ''), 'Ã¢', '–'), 'ï¿½', ''),
    summary = replace(replace(replace(replace(
      summary, 'Ãƒ', 'í'), 'Ã‚', ''), 'Ã¢', '–'), 'ï¿½', '')
where title ~ '(Ãƒ|Ã‚|Ã¢|ï¿½)'
   or summary ~ '(Ãƒ|Ã‚|Ã¢|ï¿½)';

comment on column public.organizations.scenario_generated_through_date is
  'Last operational date generated for deterministic Scenario V7.';
comment on column public.people.employment_start_date is
  'Synthetic professional start date for historical workforce metrics.';
comment on column public.people.employment_end_date is
  'Synthetic professional end date; null while active.';
comment on table public.analytics_service_dimensions is
  'Public stable service codes; internal connector UUIDs stay private.';
comment on table public.scenario_evolution_events is
  'Idempotent audit log for incremental synthetic scenario growth.';
