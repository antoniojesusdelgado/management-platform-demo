-- scenario-checksum: 52dda081ee97c456f88594a354a97ae32dc1d7571a8d99f79f00c8e74327ce07
-- target_people_count := 32
-- target_project_count := 10
-- target_task_count := 120
-- target_leave_count := 72
-- target_incident_count := 60
-- target_treasury_count := 240
-- target_payroll_count := 6
-- target_changelog_count := 10

create or replace function private.rebalance_standard_demo_scenario_v4(
  target_organization_id uuid,
  actor_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_payroll_count integer := 6;
  scenario_start constant date := date '2026-01-01';
  scenario_anchor constant date := date '2026-06-23';
begin
  if target_organization_id is null or actor_profile_id is null then
    raise exception 'organization and actor are required';
  end if;

  perform private.rebalance_standard_demo_scenario_v3(
    target_organization_id,
    actor_profile_id
  );

  with ranked as (
    select
      project.id,
      row_number() over (order by project.code, project.id) as row_number
    from public.projects project
    where project.organization_id = target_organization_id
  )
  update public.projects project
  set start_date = scenario_start + ((ranked.row_number - 1) * 8)::integer,
      target_date = least(
        scenario_anchor,
        scenario_start
          + ((ranked.row_number - 1) * 8 + 75 + (ranked.row_number - 1) * 4)::integer
      ),
      created_at = scenario_start + time '09:00',
      updated_at = scenario_anchor + time '09:00'
  from ranked
  where project.id = ranked.id;

  with ranked as (
    select
      task.id,
      task.status,
      row_number() over (order by task.id) as row_number
    from public.tasks task
    where task.organization_id = target_organization_id
  )
  update public.tasks task
  set created_at = (
        scenario_start
        + floor(((ranked.row_number - 1) * 172)::numeric / 119)::integer
      ) + time '09:00',
      updated_at = least(
        scenario_anchor + time '18:00',
        (
          scenario_start
          + floor(((ranked.row_number - 1) * 172)::numeric / 119)::integer
          + 14
        ) + time '16:00'
      ),
      due_date = case
        when ranked.status = 'completed'::public.task_status then least(
          scenario_anchor,
          scenario_start
            + floor(((ranked.row_number - 1) * 172)::numeric / 119)::integer
            + 21
        )
        when ranked.row_number <= 6 then scenario_anchor - ranked.row_number::integer
        else scenario_anchor
      end
  from ranked
  where task.id = ranked.id;

  with ranked as (
    select
      incident.id,
      incident.status,
      incident.priority,
      row_number() over (order by incident.id) as row_number
    from public.incidents incident
    where incident.organization_id = target_organization_id
  )
  update public.incidents incident
  set created_at = (
        scenario_start
        + floor(((ranked.row_number - 1) * 171)::numeric / 59)::integer
      ) + time '09:00',
      updated_at = least(
        scenario_anchor + time '18:00',
        (
          scenario_start
          + floor(((ranked.row_number - 1) * 171)::numeric / 59)::integer
          + 5
        ) + time '15:00'
      ),
      first_response_at = case
        when ranked.status = 'registered'::public.incident_status then null
        else least(
          scenario_anchor + time '12:00',
          (
            scenario_start
            + floor(((ranked.row_number - 1) * 171)::numeric / 59)::integer
            + 1
          ) + time '10:00'
        )
      end,
      sla_due_at = case
        when ranked.status in (
          'resolved'::public.incident_status,
          'closed'::public.incident_status
        ) then least(
          scenario_anchor + time '12:00',
          (
            scenario_start
            + floor(((ranked.row_number - 1) * 171)::numeric / 59)::integer
            + case
                when ranked.priority = 'critical'::public.incident_priority then 1
                when ranked.priority = 'high'::public.incident_priority then 2
                else 5
              end
          ) + time '12:00'
        )
        when ranked.priority = 'critical'::public.incident_priority
          then (scenario_anchor - ranked.row_number::integer) + time '12:00'
        else scenario_anchor + time '12:00'
      end
  from ranked
  where incident.id = ranked.id;

  with ranked as (
    select
      request.id,
      row_number() over (order by request.id) as row_number
    from public.leave_requests request
    where request.organization_id = target_organization_id
  )
  update public.leave_requests request
  set start_date = scenario_start
        + floor(((ranked.row_number - 1) * 168)::numeric / 71)::integer,
      end_date = least(
        scenario_anchor,
        scenario_start
          + floor(((ranked.row_number - 1) * 168)::numeric / 71)::integer
          + (1 + mod(ranked.row_number::integer, 6))
      ),
      created_at = scenario_start + time '08:00',
      updated_at = scenario_anchor + time '10:00'
  from ranked
  where request.id = ranked.id;

  with ranked as (
    select
      entry.id,
      row_number() over (order by entry.id) as row_number
    from public.treasury_entries entry
    where entry.organization_id = target_organization_id
  ),
  positioned as (
    select
      ranked.id,
      ranked.row_number,
      ((ranked.row_number - 1) / 40)::integer as month_index,
      mod((ranked.row_number - 1)::integer, 40) as month_position
    from ranked
  )
  update public.treasury_entries entry
  set entry_date = (
        (
          scenario_start
          + make_interval(months => positioned.month_index)
        )::date
        + floor(
            positioned.month_position
            * (case when positioned.month_index = 5 then 22 else 27 end)::numeric
            / 39
          )::integer
      )::date,
      amount_cents = case
        when positioned.month_position < 2
          then 2700000 + positioned.month_index * 18000
        else -round(
          (
            (2700000 + positioned.month_index * 18000) * 2
            * (1 - (0.11 + positioned.month_index * 0.01))
          ) / 38
        )::bigint
      end,
      status = case
        when positioned.row_number <= 4 then 'draft'::public.treasury_entry_status
        when positioned.row_number <= 8 then 'registered'::public.treasury_entry_status
        when positioned.row_number <= 12 then 'reconciled'::public.treasury_entry_status
        when positioned.row_number <= 120 then 'validated'::public.treasury_entry_status
        else 'closed'::public.treasury_entry_status
      end,
      created_at = scenario_start + time '07:00',
      updated_at = scenario_anchor + time '07:00'
  from positioned
  where entry.id = positioned.id;

  delete from public.payroll_runs run
  where run.organization_id = target_organization_id;

  insert into public.payroll_runs (
    id, organization_id, period_start, period_end, people_count,
    gross_total_cents, deduction_total_cents, currency, notes, status,
    created_by, created_at, updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'payroll-v4', item.row_number),
    target_organization_id,
    (scenario_start + make_interval(months => item.row_number - 1))::date,
    case
      when item.row_number = target_payroll_count then scenario_anchor
      else (
        scenario_start
        + make_interval(months => item.row_number)
        - interval '1 day'
      )::date
    end,
    30 + least(2, ((item.row_number - 1) / 2)::integer),
    item.gross_total_cents,
    round(
      item.gross_total_cents
      * (0.195 + mod((item.row_number - 1)::integer, 4) * 0.006)
    )::bigint,
    'EUR',
    'Ciclo agregado sin retribuciones individuales.',
    case
      when item.row_number <= 4 then 'closed'::public.payroll_run_status
      when item.row_number = 5 then 'reviewed'::public.payroll_run_status
      else 'validating'::public.payroll_run_status
    end,
    actor_profile_id,
    scenario_start + time '08:00',
    scenario_anchor + time '12:00'
  from (
    select
      row_number,
      9200000
        + (row_number - 1) * 120000
        + mod((row_number - 1)::integer, 4) * 45000
        as gross_total_cents
    from generate_series(1, target_payroll_count) as series(row_number)
  ) item;

  delete from public.changelog_entries entry
  where entry.organization_id = target_organization_id;

  insert into public.changelog_entries (
    id, organization_id, version, title, summary, status, published_at,
    created_by, created_at, updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'changelog-v4', item.row_number),
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
      (7, '1.0.0', 'Primera versión estable', 'Acceso con Google, aislamiento por organización y revisión de seguridad.', '2026-05-24 11:00:00+00'::timestamptz),
      (8, '1.1.0', 'Analítica y experiencia de uso', 'Indicadores, filtros, perfiles y mejoras generales de accesibilidad.', '2026-06-01 11:00:00+00'::timestamptz),
      (9, '1.2.0', 'Datos equilibrados y análisis dinámico', 'Escenario operativo revisado, filtros comparables y presentación más consistente.', '2026-06-15 11:00:00+00'::timestamptz),
      (10, '1.2.1', 'Ajustes finales de presentación', 'Acceso, gráficos, proyectos, datos y comportamiento responsive revisados.', '2026-06-23 11:00:00+00'::timestamptz)
  ) as item(row_number, version, title, summary, published_at);

  update public.organizations
  set scenario_version = 4,
      last_active_at = now()
  where id = target_organization_id;

  insert into public.demo_scenario_versions (
    organization_id, scenario_version, scenario_checksum, restored_at,
    restored_by
  )
  values (
    target_organization_id,
    4,
    '52dda081ee97c456f88594a354a97ae32dc1d7571a8d99f79f00c8e74327ce07',
    now(),
    actor_profile_id
  )
  on conflict (organization_id) do update
  set scenario_version = excluded.scenario_version,
      scenario_checksum = excluded.scenario_checksum,
      restored_at = excluded.restored_at,
      restored_by = excluded.restored_by;

  insert into public.audit_events (
    organization_id, actor_profile_id, event_type, entity_type, entity_id,
    metadata
  )
  values (
    target_organization_id,
    actor_profile_id,
    'demo.scenario.v4_restored',
    'demo_scenario',
    target_organization_id,
    jsonb_build_object(
      'scenario_version', 4,
      'checksum', '52dda081ee97c456f88594a354a97ae32dc1d7571a8d99f79f00c8e74327ce07',
      'synthetic_only', true,
      'reference_date', '2026-06-23'
    )
  );
end;
$$;

revoke all on function private.rebalance_standard_demo_scenario_v4(uuid, uuid)
from public, anon, authenticated;

alter function private.seed_standard_demo_scenario(uuid, uuid)
  rename to seed_standard_demo_scenario_v3;

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

  if current_scenario_version >= 4 then
    return;
  end if;

  if current_scenario_version < 3 then
    perform private.seed_standard_demo_scenario_v3(
      target_organization_id,
      actor_profile_id
    );
  end if;

  perform private.rebalance_standard_demo_scenario_v4(
    target_organization_id,
    actor_profile_id
  );
end;
$$;

revoke all on function private.seed_standard_demo_scenario(uuid, uuid)
from public, anon, authenticated;

create or replace function public.restore_demo_scenario_v4()
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

  if target_organization_id is null then
    raise exception 'active membership required';
  end if;

  if not private.has_permission(
    target_organization_id,
    'settings.workspace.manage'
  ) then
    raise exception 'permission denied';
  end if;

  perform private.rebalance_standard_demo_scenario_v4(
    target_organization_id,
    auth.uid()
  );
end;
$$;

revoke all on function public.restore_demo_scenario_v4()
from public, anon;
grant execute on function public.restore_demo_scenario_v4()
to authenticated;

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
    'all',
    'proyectos',
    'tareas',
    'vacaciones',
    'incidencias',
    'tesoreria',
    'nominas',
    'personal',
    'novedades'
  ) then
    raise exception 'unsupported scenario module';
  end if;

  delete from public.task_dependencies
  where organization_id = expected_organization_id;
  delete from public.task_comments
  where organization_id = expected_organization_id;
  delete from public.tasks
  where organization_id = expected_organization_id;
  delete from public.incidents
  where organization_id = expected_organization_id;
  delete from public.projects
  where organization_id = expected_organization_id;
  delete from public.leave_requests
  where organization_id = expected_organization_id;
  delete from public.treasury_entries
  where organization_id = expected_organization_id;
  delete from public.payroll_runs
  where organization_id = expected_organization_id;
  delete from public.changelog_entries
  where organization_id = expected_organization_id;
  delete from public.people
  where organization_id = expected_organization_id
    and profile_id is null;

  update public.organizations
  set scenario_version = null
  where id = expected_organization_id;

  perform private.seed_standard_demo_scenario(
    expected_organization_id,
    auth.uid()
  );

  insert into public.audit_events (
    organization_id,
    actor_profile_id,
    event_type,
    entity_type,
    metadata
  ) values (
    expected_organization_id,
    auth.uid(),
    'demo.scenario_restored',
    'demo_scenario',
    jsonb_build_object(
      'module', target_module,
      'scenario_version', 4,
      'restoration_scope', 'complete'
    )
  );
end;
$$;

revoke all on function public.restore_demo_scenario(uuid, text)
from public, anon;
grant execute on function public.restore_demo_scenario(uuid, text)
to authenticated;

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
    where coalesce(organization.scenario_version, 0) = 3
  loop
    perform private.rebalance_standard_demo_scenario_v4(
      target.organization_id,
      target.actor_profile_id
    );
  end loop;
end;
$$;
