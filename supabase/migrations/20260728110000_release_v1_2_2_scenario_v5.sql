-- scenario-checksum: a03b6b9131a42bd2afc41577f6ba8dca8d172e88171a07023db8a42ac9ad552e
-- target_people_count := 32
-- target_project_count := 10
-- target_task_count := 120
-- target_leave_count := 104
-- target_incident_count := 60
-- target_treasury_count := 360
-- target_payroll_count := 18
-- target_payroll_participant_count := 576
-- target_integration_run_count := 72
-- target_changelog_count := 12

alter table public.organizations
  add column scenario_anchor_date date;

update public.organizations
set scenario_anchor_date = current_date
where scenario_anchor_date is null;

alter table public.organizations
  alter column scenario_anchor_date set default current_date,
  alter column scenario_anchor_date set not null;

alter table public.people
  add column manager_person_id uuid references public.people(id) on delete set null,
  add constraint people_manager_not_self check (
    manager_person_id is null or manager_person_id <> id
  );

create index people_manager_person_idx
  on public.people (manager_person_id)
  where manager_person_id is not null;

create table public.payroll_participants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.payroll_runs(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  inclusion_status text not null check (inclusion_status in ('included', 'excluded')),
  validation_status text not null check (validation_status in ('validated', 'pending', 'review')),
  created_at timestamptz not null default now(),
  unique (run_id, person_id)
);

create index payroll_participants_org_run_idx
  on public.payroll_participants (organization_id, run_id, validation_status);
create index payroll_participants_person_idx
  on public.payroll_participants (person_id, run_id);

alter table public.payroll_participants enable row level security;

create policy payroll_participants_view
on public.payroll_participants
for select
to authenticated
using (private.has_permission(organization_id, 'payroll.runs.view'));

revoke all on table public.payroll_participants from public, anon;
revoke insert, update, delete on table public.payroll_participants from authenticated;
grant select on table public.payroll_participants to authenticated;

create or replace function private.rebalance_standard_demo_scenario_v5(
  target_organization_id uuid,
  actor_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  scenario_start constant date := date '2025-01-01';
  scenario_anchor date := current_date;
  target_payroll_count integer := 18;
begin
  if target_organization_id is null or actor_profile_id is null then
    raise exception 'organization and actor are required';
  end if;

  update public.organizations
  set scenario_anchor_date = scenario_anchor,
      updated_at = now()
  where id = target_organization_id;

  perform private.rebalance_standard_demo_scenario_v4(
    target_organization_id,
    actor_profile_id
  );

  with ranked as (
    select
      person.id,
      person.team,
      row_number() over (partition by person.team order by person.display_name, person.id) as team_rank,
      first_value(person.id) over (
        partition by person.team order by
          case when person.role_code = 'manager'::public.person_role_code then 0 else 1 end,
          person.display_name,
          person.id
      ) as manager_id
    from public.people person
    where person.organization_id = target_organization_id
  )
  update public.people person
  set manager_person_id = case
        when ranked.team_rank = 1 or ranked.manager_id = ranked.id then null
        else ranked.manager_id
      end,
      updated_at = scenario_anchor + time '09:00'
  from ranked
  where person.id = ranked.id;

  with ranked as (
    select project.id, row_number() over (order by project.code, project.id) as row_number
    from public.projects project
    where project.organization_id = target_organization_id
  )
  update public.projects project
  set start_date = scenario_start + ((ranked.row_number - 1) * 32)::integer,
      target_date = least(
        scenario_anchor,
        scenario_start + ((ranked.row_number - 1) * 32 + 120)::integer
      ),
      created_at = scenario_start + ((ranked.row_number - 1) * 32)::integer + time '09:00',
      updated_at = scenario_anchor + time '09:00'
  from ranked
  where project.id = ranked.id;

  with ranked as (
    select task.id, row_number() over (order by task.id) as row_number
    from public.tasks task
    where task.organization_id = target_organization_id
  )
  update public.tasks task
  set created_at = (
        scenario_start
        + floor(((ranked.row_number - 1) * 525)::numeric / 119)::integer
      ) + time '09:00',
      updated_at = least(
        scenario_anchor + time '18:00',
        (
          scenario_start
          + floor(((ranked.row_number - 1) * 525)::numeric / 119)::integer
          + 12
        ) + time '16:00'
      ),
      due_date = least(
        scenario_anchor,
        scenario_start
          + floor(((ranked.row_number - 1) * 525)::numeric / 119)::integer
          + 18
      )
  from ranked
  where task.id = ranked.id;

  with ranked as (
    select incident.id, row_number() over (order by incident.id) as row_number
    from public.incidents incident
    where incident.organization_id = target_organization_id
  )
  update public.incidents incident
  set created_at = (
        scenario_start
        + floor(((ranked.row_number - 1) * 520)::numeric / 59)::integer
      ) + time '09:00',
      updated_at = least(
        scenario_anchor + time '18:00',
        (
          scenario_start
          + floor(((ranked.row_number - 1) * 520)::numeric / 59)::integer
          + 4
        ) + time '15:00'
      ),
      first_response_at = case
        when incident.status = 'registered'::public.incident_status then null
        else (
          scenario_start
          + floor(((ranked.row_number - 1) * 520)::numeric / 59)::integer
        ) + time '11:00'
      end,
      sla_due_at = least(
        scenario_anchor + time '18:00',
        (
          scenario_start
          + floor(((ranked.row_number - 1) * 520)::numeric / 59)::integer
          + 5
        ) + time '14:00'
      )
  from ranked
  where incident.id = ranked.id;

  insert into public.leave_requests (
    id, organization_id, profile_id, start_date, end_date, leave_type,
    reason, status, created_at, updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'leave-v5-extra', item),
    target_organization_id,
    actor_profile_id,
    scenario_start + (item * 15 + mod(item, 7))::integer,
    scenario_start + (item * 15 + mod(item, 7) + 2)::integer,
    'vacation'::public.leave_type,
    'Descanso planificado.',
    'approved'::public.leave_request_status,
    scenario_start + (item * 15)::integer + time '08:00',
    scenario_start + (item * 15 + 1)::integer + time '10:00'
  from generate_series(1, 32) item;

  with ranked as (
    select request.id, row_number() over (order by request.id) as row_number
    from public.leave_requests request
    where request.organization_id = target_organization_id
  )
  update public.leave_requests request
  set start_date = least(
        scenario_anchor,
        scenario_start
          + floor(((ranked.row_number - 1) * 525)::numeric / 103)::integer
          + case
              when mod(ranked.row_number::integer, 12) in (5, 6, 7) then 20
              when mod(ranked.row_number::integer, 12) = 11 then 12
              else 0
            end
      ),
      end_date = least(
        scenario_anchor,
        scenario_start
          + floor(((ranked.row_number - 1) * 525)::numeric / 103)::integer
          + case
              when mod(ranked.row_number::integer, 12) in (5, 6, 7) then 24
              when mod(ranked.row_number::integer, 12) = 11 then 15
              else 2
            end
      ),
      status = case
        when ranked.row_number <= 80 then 'approved'::public.leave_request_status
        when ranked.row_number <= 88 then 'submitted'::public.leave_request_status
        when ranked.row_number <= 92 then 'draft'::public.leave_request_status
        when ranked.row_number <= 98 then 'rejected'::public.leave_request_status
        else 'cancelled'::public.leave_request_status
      end,
      created_at = greatest(
        scenario_start + time '08:00',
        (
          scenario_start
          + floor(((ranked.row_number - 1) * 510)::numeric / 103)::integer
          - 14
        ) + time '08:00'
      ),
      updated_at = scenario_anchor + time '10:00'
  from ranked
  where request.id = ranked.id;

  insert into public.treasury_entries (
    id, organization_id, entry_date, concept, amount_cents, currency,
    status, created_by, created_at, updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'treasury-v5-extra', item),
    target_organization_id,
    scenario_start + floor(((item - 1) * 525)::numeric / 119)::integer,
    case when mod(item, 3) = 0 then 'Cobro por servicios' else 'Pago operativo' end,
    case when mod(item, 3) = 0 then 1750000 + item * 500 else -(210000 + item * 110) end,
    'EUR',
    'closed'::public.treasury_entry_status,
    actor_profile_id,
    scenario_start + floor(((item - 1) * 525)::numeric / 119)::integer + time '07:00',
    scenario_anchor + time '07:00'
  from generate_series(1, 120) item;

  with ranked as (
    select entry.id, row_number() over (order by entry.id) as row_number
    from public.treasury_entries entry
    where entry.organization_id = target_organization_id
  )
  update public.treasury_entries entry
  set entry_date = scenario_start
        + floor(((ranked.row_number - 1) * 525)::numeric / 359)::integer,
      status = case
        when ranked.row_number <= 4 then 'draft'::public.treasury_entry_status
        when ranked.row_number <= 8 then 'registered'::public.treasury_entry_status
        when ranked.row_number <= 12 then 'reconciled'::public.treasury_entry_status
        when ranked.row_number <= 180 then 'validated'::public.treasury_entry_status
        else 'closed'::public.treasury_entry_status
      end,
      created_at = scenario_start
        + floor(((ranked.row_number - 1) * 525)::numeric / 359)::integer
        + time '07:00',
      updated_at = scenario_anchor + time '07:00'
  from ranked
  where entry.id = ranked.id;

  with monthly_ranked as (
    select
      entry.id,
      row_number() over (
        partition by date_trunc('month', entry.entry_date)
        order by entry.id
      ) as row_number,
      count(*) over (
        partition by date_trunc('month', entry.entry_date)
      ) as month_count
    from public.treasury_entries entry
    where entry.organization_id = target_organization_id
  ),
  monthly_profile as (
    select
      ranked.id,
      ranked.row_number,
      ranked.month_count,
      greatest(1, floor(ranked.month_count::numeric / 3)::integer) as income_count
    from monthly_ranked ranked
  )
  update public.treasury_entries entry
  set amount_cents = case
        when profile.row_number <= profile.income_count then 1000000
        else -round(
          (profile.income_count * 1000000 * 0.86)
          / greatest(1, profile.month_count - profile.income_count)
        )::bigint
      end,
      concept = case
        when profile.row_number <= profile.income_count then 'Cobro por servicios'
        else 'Pago operativo'
      end
  from monthly_profile profile
  where entry.id = profile.id;

  delete from public.payroll_runs run
  where run.organization_id = target_organization_id;

  insert into public.payroll_runs (
    id, organization_id, period_start, period_end, people_count,
    gross_total_cents, deduction_total_cents, currency, notes, status,
    created_by, created_at, updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'payroll-v5', item),
    target_organization_id,
    (scenario_start + make_interval(months => item - 1))::date,
    case
      when item = target_payroll_count then scenario_anchor
      else (scenario_start + make_interval(months => item) - interval '1 day')::date
    end,
    30 + least(2, ((item - 1) / 7)::integer),
    9200000 + (item - 1) * 120000 + mod((item - 1)::integer, 4) * 45000,
    round(
      (9200000 + (item - 1) * 120000 + mod((item - 1)::integer, 4) * 45000)
      * (0.195 + mod((item - 1)::integer, 4) * 0.006)
    )::bigint,
    'EUR',
    'Ciclo agregado sin retribuciones individuales.',
    case
      when item <= 16 then 'closed'::public.payroll_run_status
      when item = 17 then 'reviewed'::public.payroll_run_status
      else 'validating'::public.payroll_run_status
    end,
    actor_profile_id,
    (scenario_start + make_interval(months => item - 1))::date + time '08:00',
    scenario_anchor + time '12:00'
  from generate_series(1, target_payroll_count) item;

  insert into public.payroll_participants (
    id, organization_id, run_id, person_id, inclusion_status,
    validation_status, created_at
  )
  select
    private.demo_uuid(
      target_organization_id,
      'payroll-participant-v5',
      (run_rank.row_number - 1) * 32 + person_rank.row_number
    ),
    target_organization_id,
    run_rank.id,
    person_rank.id,
    case
      when person_rank.status = 'inactive'::public.person_status
        and run_rank.row_number >= 13 then 'excluded'
      else 'included'
    end,
    case
      when run_rank.row_number = 18 and mod(person_rank.row_number, 11) = 0 then 'review'
      when run_rank.row_number >= 17 and mod(person_rank.row_number, 7) = 0 then 'pending'
      else 'validated'
    end,
    run_rank.period_start + time '08:00'
  from (
    select run.id, run.period_start,
      row_number() over (order by run.period_start, run.id)::integer as row_number
    from public.payroll_runs run
    where run.organization_id = target_organization_id
  ) run_rank
  cross join (
    select person.id, person.status,
      row_number() over (order by person.display_name, person.id)::integer as row_number
    from public.people person
    where person.organization_id = target_organization_id
  ) person_rank;

  delete from public.integration_runs run
  where run.organization_id = target_organization_id;

  insert into public.integration_runs (
    id, organization_id, connector_id, effective_date, status, trigger_kind,
    source_sequence, processed_count, imported_count, duplicate_count,
    error_count, safe_summary, started_at, finished_at, created_by, created_at
  )
  select
    private.demo_uuid(
      target_organization_id,
      'integration-run-v5',
      (month.item - 1) * 4 + connector.row_number
    ),
    target_organization_id,
    connector.id,
    least(
      scenario_anchor,
      (scenario_start + make_interval(months => month.item - 1))::date
        + 13 + connector.row_number
    ),
    case
      when mod((month.item - 1) * 4 + connector.row_number, 17) = 0
        then 'failed'::public.integration_run_status
      when mod((month.item - 1) * 4 + connector.row_number, 7) = 0
        then 'partial'::public.integration_run_status
      else 'succeeded'::public.integration_run_status
    end,
    'schedule',
    month.item,
    case when connector.kind = 'financial'::public.integration_kind then 40 else 32 end,
    case
      when mod((month.item - 1) * 4 + connector.row_number, 17) = 0 then 26
      when mod((month.item - 1) * 4 + connector.row_number, 7) = 0 then 30
      else case when connector.kind = 'financial'::public.integration_kind then 39 else 32 end
    end,
    case when connector.kind = 'financial'::public.integration_kind then 1 else 0 end,
    case
      when mod((month.item - 1) * 4 + connector.row_number, 17) = 0 then 5
      when mod((month.item - 1) * 4 + connector.row_number, 7) = 0 then 1
      else 0
    end,
    'Ejecución programada revisada.',
    least(
      scenario_anchor,
      (scenario_start + make_interval(months => month.item - 1))::date
        + 13 + connector.row_number
    ) + time '02:15',
    least(
      scenario_anchor,
      (scenario_start + make_interval(months => month.item - 1))::date
        + 13 + connector.row_number
    ) + time '03:00',
    actor_profile_id,
    least(
      scenario_anchor,
      (scenario_start + make_interval(months => month.item - 1))::date
        + 13 + connector.row_number
    ) + time '02:00'
  from generate_series(1, 18) month(item)
  cross join (
    select id, kind,
      row_number() over (order by code)::integer as row_number
    from public.integration_connectors
    where organization_id = target_organization_id
    order by code
    limit 4
  ) connector;

  delete from public.changelog_entries entry
  where entry.organization_id = target_organization_id;

  insert into public.changelog_entries (
    id, organization_id, version, title, summary, status, published_at,
    created_by, created_at, updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'changelog-v5', item.row_number),
    target_organization_id,
    item.version,
    item.title,
    item.summary,
    'published'::public.changelog_status,
    item.published_at,
    actor_profile_id,
    item.published_at,
    item.published_at
  from (
    values
      (1, '0.1.0', 'Base de la plataforma', 'Estructura inicial, navegación por módulos y permisos de acceso.', '2026-02-02 11:00:00+00'::timestamptz),
      (2, '0.2.0', 'Gestión de vacaciones', 'Solicitudes, aprobaciones, calendario de ausencias y trazabilidad.', '2026-02-16 11:00:00+00'::timestamptz),
      (3, '0.3.0', 'Proyectos y tareas', 'Seguimiento de proyectos, responsables, dependencias y tablero Kanban.', '2026-03-02 11:00:00+00'::timestamptz),
      (4, '0.4.0', 'Incidencias y personal', 'Ciclo de atención, tiempos de resolución y directorio del equipo.', '2026-03-16 11:00:00+00'::timestamptz),
      (5, '0.5.0', 'Tesorería y nóminas', 'Movimientos conciliados y ciclos de nómina con información agregada.', '2026-03-30 11:00:00+00'::timestamptz),
      (6, '0.6.0', 'Integraciones y automatización', 'Ejecuciones programadas, control de importaciones y calidad del dato.', '2026-04-20 11:00:00+00'::timestamptz),
      (7, '0.7.0', 'Migración de datos', 'Carga histórica, validaciones de calidad y restauración controlada del escenario.', '2026-04-30 11:00:00+00'::timestamptz),
      (8, '1.0.0', 'Primera versión estable', 'Acceso con Google, aislamiento por organización y revisión de seguridad.', '2026-05-24 11:00:00+00'::timestamptz),
      (9, '1.1.0', 'Analítica y experiencia de uso', 'Indicadores, filtros, perfiles y mejoras generales de accesibilidad.', '2026-06-01 11:00:00+00'::timestamptz),
      (10, '1.2.0', 'Datos equilibrados y análisis dinámico', 'Escenario operativo revisado, filtros comparables y presentación más consistente.', '2026-06-15 11:00:00+00'::timestamptz),
      (11, '1.2.1', 'Ajustes finales de presentación', 'Acceso, gráficos, proyectos, datos y comportamiento responsive revisados.', '2026-06-16 11:00:00+00'::timestamptz),
      (12, '1.2.2', 'Interfaz y datos revisados', 'Mejoras de acceso, analítica, trabajo móvil, nóminas y estructura de equipos.', '2026-06-17 11:00:00+00'::timestamptz)
  ) as item(row_number, version, title, summary, published_at);

  update public.organizations
  set scenario_version = 5,
      last_active_at = now()
  where id = target_organization_id;

  insert into public.demo_scenario_versions (
    organization_id, scenario_version, scenario_checksum, restored_at, restored_by
  )
  values (
    target_organization_id,
    5,
    'a03b6b9131a42bd2afc41577f6ba8dca8d172e88171a07023db8a42ac9ad552e',
    now(),
    actor_profile_id
  )
  on conflict (organization_id) do update
  set scenario_version = excluded.scenario_version,
      scenario_checksum = excluded.scenario_checksum,
      restored_at = excluded.restored_at,
      restored_by = excluded.restored_by;

  insert into public.audit_events (
    organization_id, actor_profile_id, event_type, entity_type, entity_id, metadata
  )
  values (
    target_organization_id,
    actor_profile_id,
    'demo.scenario.v5_restored',
    'demo_scenario',
    target_organization_id,
    jsonb_build_object(
      'scenario_version', 5,
      'checksum', 'a03b6b9131a42bd2afc41577f6ba8dca8d172e88171a07023db8a42ac9ad552e',
      'synthetic_only', true,
      'reference_date', '2026-06-17'
    )
  );
end;
$$;

revoke all on function private.rebalance_standard_demo_scenario_v5(uuid, uuid)
from public, anon, authenticated;

alter function private.seed_standard_demo_scenario(uuid, uuid)
  rename to seed_standard_demo_scenario_v4;

create or replace function private.seed_standard_demo_scenario(
  target_organization_id uuid,
  actor_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_scenario_version integer;
begin
  select coalesce(organization.scenario_version, 0)
  into current_scenario_version
  from public.organizations organization
  where organization.id = target_organization_id
  for update;

  if current_scenario_version >= 5 then
    return;
  end if;

  if current_scenario_version < 4 then
    perform private.seed_standard_demo_scenario_v4(
      target_organization_id,
      actor_profile_id
    );
  end if;

  perform private.rebalance_standard_demo_scenario_v5(
    target_organization_id,
    actor_profile_id
  );
end;
$$;

revoke all on function private.seed_standard_demo_scenario(uuid, uuid)
from public, anon, authenticated;

create or replace function public.restore_demo_scenario_v5()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select membership.organization_id
  into target_organization_id
  from public.memberships membership
  where membership.profile_id = auth.uid()
    and membership.status = 'active'
  order by membership.created_at
  limit 1;

  if target_organization_id is null
    or not private.has_permission(target_organization_id, 'settings.workspace.manage')
  then
    raise exception 'permission denied';
  end if;

  perform private.rebalance_standard_demo_scenario_v5(
    target_organization_id,
    auth.uid()
  );
end;
$$;

revoke all on function public.restore_demo_scenario_v5() from public, anon;
grant execute on function public.restore_demo_scenario_v5() to authenticated;

create or replace function public.restore_demo_scenario(
  expected_organization_id uuid,
  target_module text default 'all'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.has_permission(
    expected_organization_id,
    'settings.workspace.manage'
  ) then
    raise exception 'permission denied';
  end if;

  if target_module not in (
    'all', 'proyectos', 'tareas', 'vacaciones', 'incidencias',
    'tesoreria', 'nominas', 'personal', 'novedades'
  ) then
    raise exception 'unsupported scenario module';
  end if;

  delete from public.task_dependencies where organization_id = expected_organization_id;
  delete from public.task_comments where organization_id = expected_organization_id;
  delete from public.tasks where organization_id = expected_organization_id;
  delete from public.incidents where organization_id = expected_organization_id;
  delete from public.projects where organization_id = expected_organization_id;
  delete from public.leave_requests where organization_id = expected_organization_id;
  delete from public.treasury_entries where organization_id = expected_organization_id;
  delete from public.payroll_runs where organization_id = expected_organization_id;
  delete from public.integration_runs where organization_id = expected_organization_id;
  delete from public.changelog_entries where organization_id = expected_organization_id;
  delete from public.people
  where organization_id = expected_organization_id and profile_id is null;

  update public.organizations
  set scenario_version = null
  where id = expected_organization_id;

  perform private.seed_standard_demo_scenario(expected_organization_id, auth.uid());

  insert into public.audit_events (
    organization_id, actor_profile_id, event_type, entity_type, metadata
  )
  values (
    expected_organization_id,
    auth.uid(),
    'demo.scenario_restored',
    'demo_scenario',
    jsonb_build_object(
      'module', target_module,
      'scenario_version', 5,
      'restoration_scope', 'complete'
    )
  );
end;
$$;

revoke all on function public.restore_demo_scenario(uuid, text) from public, anon;
grant execute on function public.restore_demo_scenario(uuid, text) to authenticated;

do $$
declare
  target record;
begin
  for target in
    select
      organization.id as organization_id,
      membership.profile_id as actor_profile_id
    from public.organizations organization
    join lateral (
      select active_membership.profile_id
      from public.memberships active_membership
      where active_membership.organization_id = organization.id
        and active_membership.status = 'active'
      order by active_membership.created_at
      limit 1
    ) membership on true
    where coalesce(organization.scenario_version, 0) = 4
  loop
    perform private.rebalance_standard_demo_scenario_v5(
      target.organization_id,
      target.actor_profile_id
    );
  end loop;
end;
$$;
