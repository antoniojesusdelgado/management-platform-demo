-- scenario-checksum: c42a65f8372a1614b1a18e50bc8b8b5953093aa0a75c3b2f8f2131176bb63d34
create table public.demo_scenario_versions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  scenario_version integer not null check (scenario_version > 0),
  scenario_checksum text not null check (scenario_checksum ~ '^[0-9a-f]{64}$'),
  restored_at timestamptz not null default now(),
  restored_by uuid references public.profiles(id) on delete set null
);

alter table public.demo_scenario_versions enable row level security;

create policy demo_scenario_versions_view
on public.demo_scenario_versions
for select
to authenticated
using (private.is_org_member(organization_id));

grant select on public.demo_scenario_versions to authenticated;

create index demo_scenario_versions_restored_by_idx
  on public.demo_scenario_versions (restored_by);

create or replace function public.mark_demo_scenario_v2_restored(
  target_organization_id uuid,
  target_checksum text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if not private.has_permission(
    target_organization_id,
    'settings.workspace.manage'
  ) then
    raise exception 'permission denied';
  end if;
  if target_checksum !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid scenario checksum';
  end if;

  insert into public.demo_scenario_versions (
    organization_id,
    scenario_version,
    scenario_checksum,
    restored_at,
    restored_by
  )
  values (
    target_organization_id,
    2,
    target_checksum,
    now(),
    auth.uid()
  )
  on conflict (organization_id) do update
  set scenario_version = excluded.scenario_version,
      scenario_checksum = excluded.scenario_checksum,
      restored_at = excluded.restored_at,
      restored_by = excluded.restored_by
  where public.demo_scenario_versions.scenario_version < 2;

  insert into public.audit_events (
    organization_id,
    actor_profile_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_organization_id,
    auth.uid(),
    'demo.scenario.v2_restored',
    'demo_scenario',
    target_organization_id,
    jsonb_build_object(
      'scenario_version', 2,
      'checksum', target_checksum,
      'synthetic_only', true
    )
  );
end;
$$;

revoke all on function public.mark_demo_scenario_v2_restored(uuid, text)
from public, anon;
grant execute on function public.mark_demo_scenario_v2_restored(uuid, text)
to authenticated;

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
  linked_person_id uuid;
  person_ids uuid[];
  project_ids uuid[];
  people_names text[] := array[
    'Lucía Martín','Álvaro Romero','Carmen Vidal','Hugo Navarro',
    'Sofía Campos','Daniel Ortega','Elena Costa','Marcos León',
    'Irene Salas','Pablo Ríos','Nora Ferrer','Adrián Vega',
    'Claudia Serra','Mateo Lozano','Julia Pastor','Leo Cabrera',
    'Valeria Prieto','Bruno Molina','Aitana Rey','Sergio Peña',
    'Marta Soler','Nicolás Blanco','Emma Galán','Álex Fuentes',
    'Vega Santamaría','Rubén Pardo','Lara Moya','Samuel Cano',
    'Olivia Núñez','Gonzalo Iglesias','Inés Pascual','Mario Arias'
  ];
  teams text[] := array[
    'Operaciones','Producto','Tecnología','Atención','Datos','Administración'
  ];
  positions text[] := array[
    'Responsable de operaciones','Product manager','Responsable de plataforma',
    'Responsable de experiencia','Analista de datos','Especialista financiero',
    'Coordinadora de procesos','Diseñador de producto','Ingeniera frontend',
    'Especialista de soporte','Especialista BI','Analista de control',
    'Gestora de proyectos','Analista funcional','Ingeniera backend',
    'Técnico de soporte','Ingeniera de datos','Especialista laboral',
    'Analista de procesos','Investigador UX','Especialista QA',
    'Gestor de servicio','Analista de calidad','Técnico administrativo',
    'Coordinadora de capacidad','Product operations','Especialista DevOps',
    'Analista de incidencias','Consultora analítica','Controller financiero',
    'Gestora de automatización','Arquitecto de soluciones'
  ];
  project_codes text[] := array[
    'CLIENT','DATA','AUTO','SUPPORT','CAPACITY','FINOPS',
    'PEOPLE','INSIGHT','MOBILE','RELIAB','SECURE','CONTENT'
  ];
  project_names text[] := array[
    'Portal de clientes','Calidad del dato','Automatización de operaciones',
    'Experiencia de soporte','Planificación de capacidad','Control financiero',
    'Experiencia de personas','Análisis de la operación','Operación móvil',
    'Fiabilidad de integraciones','Gobierno de accesos','Comunicación interna'
  ];
  task_actions text[] := array[
    'Definir criterios de aceptación','Validar el flujo con el equipo',
    'Preparar el tablero de seguimiento','Revisar dependencias técnicas',
    'Documentar decisiones de diseño','Configurar alertas de calidad',
    'Ajustar permisos por rol','Analizar resultados de la prueba',
    'Resolver observaciones de accesibilidad','Preparar la revisión funcional',
    'Optimizar la consulta agregada','Verificar el comportamiento adaptable',
    'Diseñar el plan de contingencia','Actualizar la guía operativa',
    'Contrastar métricas con el periodo anterior',
    'Revisar la trazabilidad de eventos'
  ];
  incident_titles text[] := array[
    'Importación nocturna retrasada','Permiso de edición incorrecto',
    'Movimientos duplicados en revisión',
    'Sincronización parcial del directorio',
    'Degradación del panel de indicadores','Desfase en el estado del proyecto',
    'Notificación interna no entregada',
    'Conciliación automática incompleta','Vista guardada sin filtros',
    'SLA calculado con calendario anterior','Dependencia bloqueada sin aviso',
    'Publicación programada pendiente'
  ];
  news_titles text[] := array[
    'Nueva vista general de la operación',
    'Mejoras en la planificación de capacidad',
    'Tableros de trabajo más ágiles',
    'Seguimiento ampliado de integraciones',
    'Nuevos controles de calidad del dato',
    'Experiencia renovada para vacaciones',
    'Proyectos con señales de riesgo',
    'Conciliación asistida de movimientos',
    'Perfil y preferencias más personalizables',
    'Accesibilidad reforzada en toda la plataforma',
    'Indicadores agregados de nómina',
    'Novedades con una presentación editorial'
  ];
begin
  if target_organization_id is null or actor_profile_id is null then
    raise exception 'organization and actor are required';
  end if;

  perform 1
  from public.organizations organization
  where organization.id = target_organization_id
  for update;

  if coalesce((
    select organization.scenario_version
    from public.organizations organization
    where organization.id = target_organization_id
  ), 0) >= 2 then
    return;
  end if;

  select person.id into linked_person_id
  from public.people person
  where person.organization_id = target_organization_id
    and person.profile_id = actor_profile_id;

  if linked_person_id is null then
    raise exception 'linked person is required before scenario seeding';
  end if;

  update public.people
  set display_name = people_names[1],
      team = teams[1],
      position_title = positions[1],
      status = 'active',
      role_code = 'admin',
      updated_at = now()
  where id = linked_person_id;

  insert into public.people (
    id, organization_id, display_name, team, position_title, status,
    role_code
  )
  select
    private.demo_uuid(target_organization_id, 'person-v2', item),
    target_organization_id,
    people_names[item],
    teams[((item - 1) % 6) + 1],
    positions[item],
    case
      when item = 31 then 'inactive'::public.person_status
      when item = 30 then 'suspended'::public.person_status
      else 'active'::public.person_status
    end,
    case
      when item <= 6 then 'manager'::public.person_role_code
      when item >= 29 then 'viewer'::public.person_role_code
      else 'collaborator'::public.person_role_code
    end
  from generate_series(2, 32) item
  on conflict (id) do update
  set display_name = excluded.display_name,
      team = excluded.team,
      position_title = excluded.position_title,
      status = excluded.status,
      role_code = excluded.role_code;

  select array[linked_person_id] || array_agg(
    private.demo_uuid(target_organization_id, 'person-v2', item)
    order by item
  )
  into person_ids
  from generate_series(2, 32) item;

  insert into public.projects (
    id, organization_id, code, name, summary, status, health,
    owner_person_id, start_date, target_date, color, created_by
  )
  select
    private.demo_uuid(target_organization_id, 'project-v2', item),
    target_organization_id,
    project_codes[item],
    project_names[item],
    'Coordina alcance, responsables, fechas y dependencias para completar el proyecto.',
    (array[
      'active','active','active','active','planned','active',
      'active','active','on_hold','active','active','completed'
    ]::public.project_status[])[item],
    (array[
      'on_track','at_risk','on_track','off_track','on_track','at_risk',
      'on_track','on_track','off_track','at_risk','on_track','on_track'
    ]::public.project_health[])[item],
    person_ids[((item * 2 - 1) % 12) + 1],
    (date_trunc('month', current_date) - ((item % 8 + 2) || ' months')::interval)::date,
    (date_trunc('month', current_date) + ((item % 7 + 1) || ' months')::interval)::date,
    (array[
      '#4f46e5','#0d9488','#2563eb','#d97706','#7c3aed','#0891b2',
      '#16a34a','#4338ca','#0f766e','#ea580c','#334155','#be185d'
    ])[item],
    actor_profile_id
  from generate_series(1, 12) item
  on conflict (id) do nothing;

  select array_agg(
    private.demo_uuid(target_organization_id, 'project-v2', item)
    order by item
  )
  into project_ids
  from generate_series(1, 12) item;

  insert into public.project_members (
    project_id, person_id, organization_id, created_by
  )
  select
    project_ids[project_item],
    person_ids[((project_item * 5 + member_item - 2) % 32) + 1],
    target_organization_id,
    actor_profile_id
  from generate_series(1, 12) project_item
  cross join generate_series(1, 8) member_item
  on conflict (project_id, person_id) do nothing;

  insert into public.tasks (
    id, organization_id, project_id, title, description, status, priority,
    assignee_person_id, due_date, created_by, created_at, updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'task-v2', item),
    target_organization_id,
    project_ids[((item - 1) % 12) + 1],
    task_actions[((item - 1) % 16) + 1] || ' · ' ||
      project_names[((item - 1) % 12) + 1],
    'Actividad coordinada con el proyecto para revisar dependencias, capacidad y fechas.',
    (array[
      'pending','in_progress','blocked','in_review','completed'
    ]::public.task_status[])[((item * 7 - 1) % 5) + 1],
    (array[
      'low','medium','high','urgent'
    ]::public.task_priority[])[((item * 5 - 1) % 4) + 1],
    case when item % 17 = 0 then null
      else person_ids[((item * 3 - 1) % 32) + 1] end,
    case when item % 19 = 0 then null
      else current_date - 90 + item % 180 end,
    actor_profile_id,
    now() - interval '12 months' + (item || ' hours')::interval,
    now() - interval '11 months' + (item || ' hours')::interval
  from generate_series(1, 320) item
  on conflict (id) do nothing;

  insert into public.task_dependencies (
    id, organization_id, task_id, depends_on_task_id, created_by
  )
  select
    private.demo_uuid(target_organization_id, 'task-dependency-v2', item),
    target_organization_id,
    private.demo_uuid(target_organization_id, 'task-v2', item * 4),
    private.demo_uuid(target_organization_id, 'task-v2', item * 4 - 1),
    actor_profile_id
  from generate_series(1, 80) item
  on conflict (task_id, depends_on_task_id) do nothing;

  insert into public.task_comments (
    id, organization_id, task_id, author_profile_id, body, created_at
  )
  select
    private.demo_uuid(target_organization_id, 'task-comment-v2', item),
    target_organization_id,
    private.demo_uuid(target_organization_id, 'task-v2', item),
    actor_profile_id,
    (array[
      'Criterios revisados con el equipo.',
      'Queda documentada la decisión para la siguiente revisión.',
      'La revisión no ha detectado bloqueos adicionales.',
      'Se actualiza el seguimiento con el resultado de la prueba.'
    ])[((item - 1) % 4) + 1],
    now() - interval '10 months' + (item || ' hours')::interval
  from generate_series(1, 320) item
  on conflict (id) do nothing;

  insert into public.leave_requests (
    id, organization_id, profile_id, person_id, start_date, end_date,
    leave_type, reason, status, created_at, updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'leave-v2', item),
    target_organization_id,
    actor_profile_id,
    person_ids[((item * 5 - 1) % 32) + 1],
    current_date - interval '9 months' + ((item * 4) || ' days')::interval,
    current_date - interval '9 months' +
      ((item * 4 + 1 + item % 6) || ' days')::interval,
    case when item % 6 = 0 then 'personal'::public.leave_type
      else 'vacation'::public.leave_type end,
    case when item % 6 = 0 then 'Gestión personal planificada.'
      else 'Descanso anual planificado.' end,
    (array[
      'submitted','approved','approved','approved','rejected','cancelled'
    ]::public.leave_request_status[])[((item - 1) % 6) + 1],
    now() - interval '9 months' + ((item * 4) || ' days')::interval,
    now() - interval '9 months' + ((item * 4 + 1) || ' days')::interval
  from generate_series(1, 144) item
  on conflict (id) do nothing;

  insert into public.incidents (
    id, organization_id, project_id, reference, title, description, status,
    priority, category, requester_profile_id, requester_person_id,
    assignee_person_id, sla_due_at, resolution, affected_service,
    impact_scope, detection_channel, root_cause, first_response_at,
    corrective_task_id, created_at, updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'incident-v2', item),
    target_organization_id,
    project_ids[((item * 5 - 1) % 12) + 1],
    'INC-' || lpad((4100 + item)::text, 4, '0'),
    incident_titles[((item - 1) % 12) + 1],
    'Caso operativo con el contexto necesario para revisar alcance, servicio, SLA y resolución.',
    (array[
      'registered','triaged','assigned','investigating',
      'resolved','closed','closed','resolved'
    ]::public.incident_status[])[((item * 5 - 1) % 8) + 1],
    (array[
      'low','medium','medium','high','medium',
      'low','high','critical','medium','high'
    ]::public.incident_priority[])[((item * 3 - 1) % 10) + 1],
    (array[
      'access','data','hardware','software','other'
    ]::public.incident_category[])[((item * 7 - 1) % 5) + 1],
    actor_profile_id,
    person_ids[((item * 7 - 1) % 32) + 1],
    case when item % 9 = 0 then null
      else person_ids[((item * 11 - 1) % 32) + 1] end,
    case when item % 8 in (0, 1, 3, 6)
      then now() - interval '8 months' + ((item * 18 + 24) || ' hours')::interval
      else now() + (((item % 45) - 12) || ' days')::interval
    end,
    case when item % 8 in (0, 1, 3, 6)
      then 'Se aplicó la corrección y se verificó el servicio.'
      else null end,
    (array[
      'Importaciones','Accesos','Tesorería','Directorio',
      'Analítica','Proyectos'
    ])[((item - 1) % 6) + 1],
    (array['individual','team','workspace'])[((item - 1) % 3) + 1],
    (array['monitoring','support','team','automation'])[
      ((item - 1) % 4) + 1
    ],
    case when item % 4 = 0
      then 'La regla de configuración estaba desactualizada.' else null end,
    now() - interval '8 months' + ((item * 18 + 2) || ' hours')::interval,
    case when item % 8 in (0, 1, 3, 6)
      then private.demo_uuid(target_organization_id, 'task-v2', item)
      else null end,
    now() - interval '8 months' + ((item * 18) || ' hours')::interval,
    now() - interval '8 months' + ((item * 18 + 6) || ' hours')::interval
  from generate_series(1, 240) item
  on conflict (id) do nothing;

  insert into public.treasury_entries (
    id, organization_id, entry_date, concept, amount_cents, currency, status,
    created_by, category, source, created_at, updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'treasury-v2', item),
    target_organization_id,
    (
      date_trunc('month', current_date) -
      ((17 - ((item - 1) / 40)) || ' months')::interval +
      (((item - 1) % 27) || ' days')::interval
    )::date,
    case
      when ((item - 1) % 40) < 10 then
        (array[
          'Ingresos por servicios','Aportación a programa',
          'Cuota de colaboración','Regularización de proyecto'
        ])[((item - 1) % 4) + 1]
      else
        (array[
          'Servicios de infraestructura','Licencias de software',
          'Servicios profesionales','Gastos de desplazamiento',
          'Suministros de oficina','Costes de comunicación'
        ])[((item - 1) % 6) + 1]
    end,
    case when ((item - 1) % 40) < 10
      then 200000 + (item % 5) * 2500
      else -(55000 + (item % 7) * 400) end,
    'EUR',
    (array[
      'registered','reconciled','validated','closed','closed'
    ]::public.treasury_entry_status[])[((item - 1) % 5) + 1],
    actor_profile_id,
    case when ((item - 1) % 40) < 10 then 'Ingresos'
      else (array[
        'Tecnología','Operación','Actividad','Administración'
      ])[((item - 1) % 4) + 1] end,
    case when item % 3 = 0 then 'Financial Source B'
      else 'Financial Source A' end,
    now() - interval '18 months' + (item || ' hours')::interval,
    now() - interval '18 months' + (item || ' hours')::interval
  from generate_series(1, 720) item
  on conflict (id) do nothing;

  insert into public.payroll_runs (
    id, organization_id, period_start, period_end, people_count,
    gross_total_cents, deduction_total_cents, currency, notes, status,
    created_by, created_at, updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'payroll-v2', item),
    target_organization_id,
    (date_trunc('month', current_date) - ((24 - item) || ' months')::interval)::date,
    (
      date_trunc('month', current_date) -
      ((23 - item) || ' months')::interval -
      interval '1 day'
    )::date,
    27 + item % 6,
    8100000 + item * 97000 + case when item in (8, 17) then 420000 else 0 end,
    round(
      (8100000 + item * 97000 + case when item in (8, 17) then 420000 else 0 end)
      * (0.19 + (item % 4) * 0.006)
    )::bigint,
    'EUR',
    'Ciclo agregado sin importes individuales.',
    case when item <= 19 then 'closed'::public.payroll_run_status
      else (array[
        'collecting','validating','calculated','reviewed','closed'
      ]::public.payroll_run_status[])[item - 19] end,
    actor_profile_id,
    now() - ((24 - item) || ' months')::interval,
    now() - ((24 - item) || ' months')::interval
  from generate_series(1, 24) item
  on conflict (id) do nothing;

  insert into public.changelog_entries (
    id, organization_id, version, title, summary, status, published_at,
    created_by, created_at, updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'changelog-v2', item),
    target_organization_id,
    '1.' || (((item - 1) / 12) + 1)::text || '.' ||
      (((item - 1) % 12) + 1)::text,
    news_titles[((item - 1) % 12) + 1],
    'Actualización sobre capacidades y mejoras de la plataforma.',
    case when item <= 28 then 'published'::public.changelog_status
      when item <= 32 then 'in_review'::public.changelog_status
      else 'draft'::public.changelog_status end,
    case when item <= 28 then
      now() - interval '12 months' + ((item * 10) || ' days')::interval
      else null end,
    actor_profile_id,
    now() - interval '12 months' + ((item * 10) || ' days')::interval,
    now() - interval '12 months' + ((item * 10) || ' days')::interval
  from generate_series(1, 36) item
  on conflict (id) do nothing;

  update public.organizations
  set scenario_version = 2,
      last_active_at = now(),
      updated_at = now()
  where id = target_organization_id;
end;
$$;

revoke all on function private.seed_standard_demo_scenario(uuid, uuid)
from public, anon, authenticated;
