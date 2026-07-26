alter table public.organizations
  add column scenario_version integer,
  add column last_active_at timestamptz not null default now(),
  add constraint organizations_scenario_version_check check (
    scenario_version is null or scenario_version between 1 and 1000
  );

create or replace function private.demo_uuid(
  organization_id uuid,
  entity_namespace text,
  entity_index integer
)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select (
    substr(value, 1, 8) || '-' ||
    substr(value, 9, 4) || '-' ||
    substr(value, 13, 4) || '-' ||
    substr(value, 17, 4) || '-' ||
    substr(value, 21, 12)
  )::uuid
  from (
    select md5(
      organization_id::text || ':' ||
      entity_namespace || ':' ||
      entity_index::text
    ) as value
  ) digest;
$$;

revoke all on function private.demo_uuid(uuid, text, integer)
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
  linked_person_id uuid;
  person_ids uuid[];
  project_ids uuid[];
begin
  if target_organization_id is null or actor_profile_id is null then
    raise exception 'organization and actor are required';
  end if;

  perform 1
  from public.organizations organization
  where organization.id = target_organization_id
  for update;

  if (
    select organization.scenario_version
    from public.organizations organization
    where organization.id = target_organization_id
  ) is not null then
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
  set team = 'Operaciones',
      position_title = 'Administración del workspace',
      status = 'active',
      role_code = 'admin',
      updated_at = now()
  where id = linked_person_id;

  insert into public.people (
    id,
    organization_id,
    display_name,
    team,
    position_title,
    status,
    role_code
  )
  select
    private.demo_uuid(target_organization_id, 'person', item),
    target_organization_id,
    'Persona ' || lpad(item::text, 2, '0'),
    (array['Operaciones', 'Producto', 'Tecnología', 'Servicios'])[
      ((item - 1) % 4) + 1
    ],
    (array[
      'Coordinación',
      'Especialista',
      'Analista',
      'Soporte',
      'Gestión de proyecto',
      'Consultoría'
    ])[((item * 3) % 6) + 1],
    case
      when item = 22 then 'suspended'::public.person_status
      when item = 23 then 'inactive'::public.person_status
      else 'active'::public.person_status
    end,
    case
      when item <= 3 then 'manager'::public.person_role_code
      when item >= 21 then 'viewer'::public.person_role_code
      else 'collaborator'::public.person_role_code
    end
  from generate_series(1, 23) item
  on conflict (id) do nothing;

  select array[linked_person_id] || array_agg(
    private.demo_uuid(target_organization_id, 'person', item)
    order by item
  )
  into person_ids
  from generate_series(1, 23) item;

  insert into public.projects (
    id,
    organization_id,
    code,
    name,
    summary,
    status,
    health,
    owner_person_id,
    start_date,
    target_date,
    color,
    created_by
  )
  select
    private.demo_uuid(target_organization_id, 'project', item),
    target_organization_id,
    'PRJ-' || lpad(item::text, 2, '0'),
    'Iniciativa sintética ' || lpad(item::text, 2, '0'),
    'Escenario demostrativo para analizar planificación, capacidad y salud sin referencias profesionales reales.',
    (array[
      'planned',
      'active',
      'active',
      'active',
      'on_hold',
      'active',
      'completed',
      'cancelled'
    ]::public.project_status[])[item],
    (array[
      'on_track',
      'at_risk',
      'on_track',
      'off_track',
      'at_risk',
      'on_track',
      'on_track',
      'off_track'
    ]::public.project_health[])[item],
    person_ids[((item - 1) % 4) + 1],
    (current_date - interval '5 months' + ((item - 1) || ' months')::interval)::date,
    (current_date + ((item + 1) || ' months')::interval)::date,
    (array[
      '#4f46e5',
      '#0d9488',
      '#d97706',
      '#2563eb',
      '#7c3aed',
      '#0891b2',
      '#16a34a',
      '#dc2626'
    ])[item],
    actor_profile_id
  from generate_series(1, 8) item
  on conflict (id) do nothing;

  select array_agg(
    private.demo_uuid(target_organization_id, 'project', item)
    order by item
  )
  into project_ids
  from generate_series(1, 8) item;

  insert into public.project_members (
    project_id,
    person_id,
    organization_id,
    created_by
  )
  select
    project_ids[project_item],
    person_ids[((project_item * 3 + member_item - 2) % 24) + 1],
    target_organization_id,
    actor_profile_id
  from generate_series(1, 8) project_item
  cross join generate_series(1, 6) member_item
  on conflict (project_id, person_id) do nothing;

  insert into public.tasks (
    id,
    organization_id,
    project_id,
    title,
    description,
    status,
    priority,
    assignee_person_id,
    due_date,
    created_by,
    created_at,
    updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'task', item),
    target_organization_id,
    project_ids[((item - 1) % 8) + 1],
    'Tarea sintética ' || lpad(item::text, 3, '0'),
    'Trabajo demostrativo generado localmente; no representa una actividad profesional real.',
    (array[
      'pending',
      'in_progress',
      'blocked',
      'in_review',
      'completed'
    ]::public.task_status[])[((item * 7 - 1) % 5) + 1],
    (array[
      'low',
      'medium',
      'high',
      'urgent'
    ]::public.task_priority[])[((item * 5 - 1) % 4) + 1],
    case
      when item % 11 = 0 then null
      else person_ids[((item - 1) % 22) + 1]
    end,
    case
      when item % 13 = 0 then null
      else current_date - 150 + item + 7 + (item % 28)
    end,
    actor_profile_id,
    now() - interval '150 days' + (item || ' days')::interval,
    now() - interval '145 days' + (item || ' days')::interval
  from generate_series(1, 180) item
  on conflict (id) do nothing;

  insert into public.task_dependencies (
    id,
    organization_id,
    task_id,
    depends_on_task_id,
    created_by
  )
  select
    private.demo_uuid(target_organization_id, 'task-dependency', item),
    target_organization_id,
    private.demo_uuid(target_organization_id, 'task', item * 4),
    private.demo_uuid(target_organization_id, 'task', item * 4 - 1),
    actor_profile_id
  from generate_series(1, 45) item
  on conflict (task_id, depends_on_task_id) do nothing;

  insert into public.task_comments (
    id,
    organization_id,
    task_id,
    author_profile_id,
    body,
    created_at
  )
  select
    private.demo_uuid(target_organization_id, 'task-comment', item),
    target_organization_id,
    private.demo_uuid(target_organization_id, 'task', item),
    actor_profile_id,
    'Comentario sintético para documentar el seguimiento de la tarea.',
    now() - interval '90 days' + (item || ' hours')::interval
  from generate_series(1, 180) item
  on conflict (id) do nothing;

  insert into public.leave_requests (
    id,
    organization_id,
    profile_id,
    person_id,
    start_date,
    end_date,
    leave_type,
    reason,
    status,
    created_at,
    updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'leave', item),
    target_organization_id,
    actor_profile_id,
    person_ids[((item - 1) % 22) + 1],
    current_date - interval '9 months' + ((item * 5) || ' days')::interval,
    current_date - interval '9 months' + ((item * 5 + 1 + item % 8) || ' days')::interval,
    case
      when item % 5 = 0 then 'personal'::public.leave_type
      else 'vacation'::public.leave_type
    end,
    case
      when item % 5 = 0 then 'Gestión personal sintética.'
      else 'Descanso anual sintético planificado.'
    end,
    (array[
      'draft',
      'submitted',
      'approved',
      'approved',
      'rejected',
      'cancelled'
    ]::public.leave_request_status[])[((item - 1) % 6) + 1],
    now() - interval '9 months' + ((item * 5) || ' days')::interval,
    now() - interval '9 months' + ((item * 5 + 1) || ' days')::interval
  from generate_series(1, 96) item
  on conflict (id) do nothing;

  insert into public.incidents (
    id,
    organization_id,
    project_id,
    reference,
    title,
    description,
    status,
    priority,
    category,
    requester_profile_id,
    requester_person_id,
    assignee_person_id,
    sla_due_at,
    resolution,
    created_at,
    updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'incident', item),
    target_organization_id,
    project_ids[((item - 1) % 8) + 1],
    'INC-' || lpad(item::text, 4, '0'),
    'Incidencia sintética ' || lpad(item::text, 3, '0'),
    'Caso demostrativo para analizar clasificación, SLA y resolución sin datos de una organización real.',
    (array[
      'registered',
      'triaged',
      'assigned',
      'investigating',
      'resolved',
      'closed'
    ]::public.incident_status[])[((item * 5 - 1) % 6) + 1],
    (array[
      'low',
      'medium',
      'high',
      'critical'
    ]::public.incident_priority[])[((item * 3 - 1) % 4) + 1],
    (array[
      'access',
      'data',
      'hardware',
      'software',
      'other'
    ]::public.incident_category[])[((item * 7 - 1) % 5) + 1],
    actor_profile_id,
    person_ids[((item + 6) % 22) + 1],
    case
      when item % 6 = 1 then null
      else person_ids[((item - 1) % 8) + 1]
    end,
    now() - interval '120 days' + ((item * 2 + 5) || ' days')::interval,
    case
      when item % 6 in (0, 5) then 'Resolución sintética verificada.'
      else null
    end,
    now() - interval '120 days' + ((item * 2) || ' days')::interval,
    now() - interval '118 days' + ((item * 2) || ' days')::interval
  from generate_series(1, 120) item
  on conflict (id) do nothing;

  insert into public.treasury_entries (
    id,
    organization_id,
    entry_date,
    concept,
    amount_cents,
    currency,
    status,
    created_by,
    created_at,
    updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'treasury', item),
    target_organization_id,
    current_date - interval '17 months' + (item || ' days')::interval,
    'Movimiento sintético importado ' || lpad(item::text, 4, '0'),
    (4500 + item * 431) * case when item % 3 = 0 then 1 else -1 end,
    'EUR',
    (array[
      'draft',
      'registered',
      'reconciled',
      'validated',
      'closed'
    ]::public.treasury_entry_status[])[((item * 3 - 1) % 5) + 1],
    actor_profile_id,
    now() - interval '17 months' + (item || ' days')::interval,
    now() - interval '17 months' + (item || ' days')::interval
  from generate_series(1, 540) item
  on conflict (id) do nothing;

  insert into public.payroll_runs (
    id,
    organization_id,
    period_start,
    period_end,
    people_count,
    gross_total_cents,
    deduction_total_cents,
    currency,
    notes,
    status,
    created_by,
    created_at,
    updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'payroll', item),
    target_organization_id,
    (date_trunc('month', current_date) - ((18 - item) || ' months')::interval)::date,
    (
      date_trunc('month', current_date) -
      ((17 - item) || ' months')::interval -
      interval '1 day'
    )::date,
    20 + item % 5,
    6200000 + item * 82000,
    round((6200000 + item * 82000) * (0.195 + (item % 4) * 0.006))::bigint,
    'EUR',
    'Ciclo agregado completamente sintético.',
    case
      when item <= 14 then 'closed'::public.payroll_run_status
      else (array[
        'collecting',
        'validating',
        'calculated',
        'reviewed',
        'closed'
      ]::public.payroll_run_status[])[((item - 1) % 5) + 1]
    end,
    actor_profile_id,
    now() - ((18 - item) || ' months')::interval,
    now() - ((18 - item) || ' months')::interval
  from generate_series(1, 18) item
  on conflict (id) do nothing;

  insert into public.changelog_entries (
    id,
    organization_id,
    version,
    title,
    summary,
    status,
    published_at,
    created_by,
    created_at,
    updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'changelog', item),
    target_organization_id,
    '0.' || (((item - 1) / 4) + 1)::text || '.' || ((item - 1) % 4)::text,
    'Evolución demostrativa ' || lpad(item::text, 2, '0'),
    'Nota editorial sintética sobre una mejora funcional de la plataforma de demostración.',
    case
      when item <= 18 then 'published'::public.changelog_status
      when item <= 21 then 'in_review'::public.changelog_status
      else 'draft'::public.changelog_status
    end,
    case
      when item <= 18 then now() - interval '11 months' + ((item * 15) || ' days')::interval
      else null
    end,
    actor_profile_id,
    now() - interval '11 months' + ((item * 15) || ' days')::interval,
    now() - interval '11 months' + ((item * 15) || ' days')::interval
  from generate_series(1, 24) item
  on conflict (id) do nothing;

  update public.organizations
  set scenario_version = 1,
      last_active_at = now(),
      updated_at = now()
  where id = target_organization_id;
end;
$$;

revoke all on function private.seed_standard_demo_scenario(uuid, uuid)
from public, anon, authenticated;

create or replace function private.seed_demo_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' and exists (
    select 1
    from public.roles role
    where role.id = new.role_id
      and role.organization_id = new.organization_id
      and role.code = 'demo_admin'
  ) then
    perform private.seed_standard_demo_scenario(
      new.organization_id,
      new.profile_id
    );
  end if;
  return new;
end;
$$;

revoke all on function private.seed_demo_membership()
from public, anon, authenticated;

create trigger seed_demo_membership
after insert on public.memberships
for each row execute function private.seed_demo_membership();

create index organizations_last_active_idx
  on public.organizations (last_active_at)
  where scenario_version is not null;
