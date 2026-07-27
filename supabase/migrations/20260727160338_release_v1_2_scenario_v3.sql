-- scenario-checksum: 0c4f7e3c34529fc64df3fa9d95ecdba8a1104694f2ac4c5a23dbcdd52340a3d5
-- remote-migration-version: 20260727160338
-- target_people_count := 32
-- target_project_count := 10
-- target_task_count := 120
-- target_leave_count := 72
-- target_incident_count := 60
-- target_treasury_count := 240
-- target_payroll_count := 18
-- target_changelog_count := 9

alter function private.seed_standard_demo_scenario(uuid, uuid)
  rename to seed_standard_demo_scenario_v2;

create or replace function private.rebalance_standard_demo_scenario_v3(
  target_organization_id uuid,
  actor_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_task_count integer := 120;
  target_leave_count integer := 72;
  target_incident_count integer := 60;
  target_treasury_count integer := 240;
  target_payroll_count integer := 18;
begin
  if target_organization_id is null or actor_profile_id is null then
    raise exception 'organization and actor are required';
  end if;

  delete from public.tasks task
  using public.projects project
  where task.organization_id = target_organization_id
    and task.project_id = project.id
    and project.code in ('SECURE', 'CONTENT');

  delete from public.incidents incident
  using public.projects project
  where incident.organization_id = target_organization_id
    and incident.project_id = project.id
    and project.code in ('SECURE', 'CONTENT');

  with ranked as (
    select task.id,
           row_number() over (order by task.created_at desc, task.id) as row_number
    from public.tasks task
    where task.organization_id = target_organization_id
  )
  delete from public.tasks task
  using ranked
  where task.id = ranked.id
    and ranked.row_number > target_task_count;

  with ranked as (
    select task.id,
           row_number() over (order by task.created_at desc, task.id) as row_number
    from public.tasks task
    where task.organization_id = target_organization_id
  )
  update public.tasks task
  set status = case
        when ranked.row_number <= 20 then 'pending'::public.task_status
        when ranked.row_number <= 35 then 'in_progress'::public.task_status
        when ranked.row_number <= 40 then 'blocked'::public.task_status
        when ranked.row_number <= 50 then 'in_review'::public.task_status
        else 'completed'::public.task_status
      end,
      priority = case
        when ranked.row_number <= 5 then 'urgent'::public.task_priority
        when ranked.row_number <= 30 then 'high'::public.task_priority
        when ranked.row_number <= 90 then 'medium'::public.task_priority
        else 'low'::public.task_priority
      end,
      due_date = case
        when ranked.row_number <= 6 then current_date - ranked.row_number::integer
        when ranked.row_number <= 50 then current_date + ranked.row_number::integer
        else task.due_date
      end,
      updated_at = now()
  from ranked
  where task.id = ranked.id;

  with ranked as (
    select incident.id,
           row_number() over (order by incident.created_at desc, incident.id) as row_number
    from public.incidents incident
    where incident.organization_id = target_organization_id
  )
  delete from public.incidents incident
  using ranked
  where incident.id = ranked.id
    and ranked.row_number > target_incident_count;

  with ranked as (
    select incident.id,
           row_number() over (order by incident.created_at desc, incident.id) as row_number
    from public.incidents incident
    where incident.organization_id = target_organization_id
  )
  update public.incidents incident
  set status = case
        when ranked.row_number <= 2 then 'registered'::public.incident_status
        when ranked.row_number <= 4 then 'triaged'::public.incident_status
        when ranked.row_number <= 7 then 'assigned'::public.incident_status
        when ranked.row_number <= 12 then 'investigating'::public.incident_status
        when ranked.row_number <= 30 then 'resolved'::public.incident_status
        else 'closed'::public.incident_status
      end,
      priority = case
        when ranked.row_number <= 2 then 'critical'::public.incident_priority
        when ranked.row_number <= 12 then 'high'::public.incident_priority
        when ranked.row_number <= 42 then 'medium'::public.incident_priority
        else 'low'::public.incident_priority
      end,
      sla_due_at = case
        when ranked.row_number <= 2 then now() - make_interval(days => ranked.row_number::integer)
        when ranked.row_number <= 12 then now() + make_interval(days => ranked.row_number::integer)
        else incident.sla_due_at
      end,
      resolution = case
        when ranked.row_number > 12
          then coalesce(incident.resolution, 'Se corrigió la causa y se comprobó el servicio afectado.')
        else null
      end,
      updated_at = now()
  from ranked
  where incident.id = ranked.id;

  with ranked as (
    select request.id,
           row_number() over (order by request.start_date desc, request.id) as row_number
    from public.leave_requests request
    where request.organization_id = target_organization_id
  )
  delete from public.leave_requests request
  using ranked
  where request.id = ranked.id
    and ranked.row_number > target_leave_count;

  with ranked as (
    select request.id,
           row_number() over (order by request.start_date, request.id) as row_number
    from public.leave_requests request
    where request.organization_id = target_organization_id
  )
  update public.leave_requests request
  set status = case
        when ranked.row_number <= 45 then 'approved'::public.leave_request_status
        when ranked.row_number <= 53 then 'submitted'::public.leave_request_status
        when ranked.row_number <= 58 then 'draft'::public.leave_request_status
        when ranked.row_number <= 64 then 'rejected'::public.leave_request_status
        else 'cancelled'::public.leave_request_status
      end,
      updated_at = now()
  from ranked
  where request.id = ranked.id;

  with ranked as (
    select entry.id,
           row_number() over (order by entry.entry_date desc, entry.id) as row_number
    from public.treasury_entries entry
    where entry.organization_id = target_organization_id
  )
  delete from public.treasury_entries entry
  using ranked
  where entry.id = ranked.id
    and ranked.row_number > target_treasury_count;

  with ranked as (
    select entry.id,
           row_number() over (order by entry.entry_date, entry.id) as row_number
    from public.treasury_entries entry
    where entry.organization_id = target_organization_id
  )
  update public.treasury_entries entry
  set amount_cents = case
        when mod(ranked.row_number - 1, 10) < 2 then 2700000
        else -580000
      end,
      status = case
        when ranked.row_number <= 4 then 'draft'::public.treasury_entry_status
        when ranked.row_number <= 8 then 'registered'::public.treasury_entry_status
        when ranked.row_number <= 16 then 'reconciled'::public.treasury_entry_status
        when ranked.row_number <= 120 then 'validated'::public.treasury_entry_status
        else 'closed'::public.treasury_entry_status
      end,
      updated_at = now()
  from ranked
  where entry.id = ranked.id;

  with ranked as (
    select run.id,
           row_number() over (order by run.period_start desc, run.id) as row_number
    from public.payroll_runs run
    where run.organization_id = target_organization_id
  )
  delete from public.payroll_runs run
  using ranked
  where run.id = ranked.id
    and ranked.row_number > target_payroll_count;

  with ranked as (
    select run.id,
           row_number() over (order by run.period_start, run.id) as row_number
    from public.payroll_runs run
    where run.organization_id = target_organization_id
  )
  update public.payroll_runs run
  set people_count = 30 + least(2, ((ranked.row_number - 1) / 7)::integer),
      gross_total_cents = 9200000 + (ranked.row_number - 1) * 120000,
      deduction_total_cents = round((9200000 + (ranked.row_number - 1) * 120000) * 0.205)::bigint,
      status = case
        when ranked.row_number <= 16 then 'closed'::public.payroll_run_status
        when ranked.row_number = 17 then 'reviewed'::public.payroll_run_status
        else 'validating'::public.payroll_run_status
      end,
      updated_at = now()
  from ranked
  where run.id = ranked.id;

  delete from public.projects project
  where project.organization_id = target_organization_id
    and project.code in ('SECURE', 'CONTENT');

  update public.projects project
  set status = case project.code
        when 'PEOPLE' then 'completed'::public.project_status
        when 'INSIGHT' then 'completed'::public.project_status
        when 'MOBILE' then 'completed'::public.project_status
        when 'RELIAB' then 'planned'::public.project_status
        when 'FINOPS' then 'on_hold'::public.project_status
        else 'active'::public.project_status
      end,
      health = case project.code
        when 'CAPACITY' then 'at_risk'::public.project_health
        when 'FINOPS' then 'off_track'::public.project_health
        else 'on_track'::public.project_health
      end,
      updated_at = now()
  where project.organization_id = target_organization_id;

  delete from public.changelog_entries entry
  where entry.organization_id = target_organization_id;

  insert into public.changelog_entries (
    id, organization_id, version, title, summary, status, published_at,
    created_by, created_at, updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'changelog-v3', item.row_number),
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
      (8, '1.1.0', 'Analítica y experiencia de uso', 'Indicadores, filtros, perfiles y mejoras generales de accesibilidad.', '2026-06-23 11:00:00+00'::timestamptz),
      (9, '1.2.0', 'Datos equilibrados y análisis dinámico', 'Escenario operativo revisado, filtros comparables y presentación más consistente.', '2026-07-27 11:00:00+00'::timestamptz)
  ) as item(row_number, version, title, summary, published_at);

  update public.organizations
  set scenario_version = 3,
      last_active_at = now()
  where id = target_organization_id;

  insert into public.demo_scenario_versions (
    organization_id, scenario_version, scenario_checksum, restored_at,
    restored_by
  )
  values (
    target_organization_id,
    3,
    '0c4f7e3c34529fc64df3fa9d95ecdba8a1104694f2ac4c5a23dbcdd52340a3d5',
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
    'demo.scenario.v3_restored',
    'demo_scenario',
    target_organization_id,
    jsonb_build_object(
      'scenario_version', 3,
      'checksum', '0c4f7e3c34529fc64df3fa9d95ecdba8a1104694f2ac4c5a23dbcdd52340a3d5',
      'synthetic_only', true
    )
  );
end;
$$;

revoke all on function private.rebalance_standard_demo_scenario_v3(uuid, uuid)
from public, anon, authenticated;

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

  if current_scenario_version >= 3 then
    return;
  end if;

  if current_scenario_version < 2 then
    perform private.seed_standard_demo_scenario_v2(
      target_organization_id,
      actor_profile_id
    );
  end if;

  perform private.rebalance_standard_demo_scenario_v3(
    target_organization_id,
    actor_profile_id
  );
end;
$$;

revoke all on function private.seed_standard_demo_scenario(uuid, uuid)
from public, anon, authenticated;

create or replace function public.restore_demo_scenario_v3()
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

  update public.organizations
  set scenario_version = 2
  where id = target_organization_id;

  perform private.rebalance_standard_demo_scenario_v3(
    target_organization_id,
    auth.uid()
  );
end;
$$;

revoke all on function public.restore_demo_scenario_v3()
from public, anon;
grant execute on function public.restore_demo_scenario_v3()
to authenticated;
