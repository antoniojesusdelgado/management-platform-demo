begin;
select plan(79);

insert into auth.users (
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'member-a@example.test',
    '{}',
    '{"display_name":"Miembro A"}',
    now(),
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'member-b@example.test',
    '{}',
    '{"display_name":"Miembro B"}',
    now(),
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'member-c@example.test',
    '{}',
    '{"display_name":"Miembro C"}',
    now(),
    now()
  );

insert into public.organizations (id, name, slug)
values
  ('30000000-0000-4000-8000-000000000001', 'Organización A', 'organizacion-a'),
  ('30000000-0000-4000-8000-000000000002', 'Organización B', 'organizacion-b');

insert into public.roles (id, organization_id, code, name, color)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'manager_a',
    'Responsable A',
    '#2563eb'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    'member_b',
    'Miembro B',
    '#64748b'
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000001',
    'custom_a',
    'Rol editable A',
    '#0891b2'
  );

insert into public.role_permissions (role_id, permission_id)
select
  '40000000-0000-4000-8000-000000000001',
  id
from public.permissions
where code in (
  'vacations.requests.view',
  'vacations.requests.create',
  'vacations.requests.approve',
  'tasks.items.view',
  'tasks.items.manage',
  'incidents.tickets.view',
  'incidents.tickets.manage',
  'people.profiles.view',
  'people.profiles.manage'
  ,'changelog.entries.view'
  ,'changelog.entries.manage'
  ,'treasury.entries.view'
  ,'treasury.entries.manage'
  ,'payroll.runs.view'
  ,'payroll.runs.manage'
  ,'settings.workspace.manage'
);

insert into public.memberships (
  organization_id,
  profile_id,
  role_id,
  status
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'active'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000002',
    'active'
  ),
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000003',
    '40000000-0000-4000-8000-000000000003',
    'invited'
  );

insert into public.leave_requests (
  id,
  organization_id,
  profile_id,
  start_date,
  end_date,
  leave_type,
  reason,
  status
)
values
  (
    '50000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '2026-10-05',
    '2026-10-07',
    'vacation',
    'Solicitud propia en borrador.',
    'draft'
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '2026-11-02',
    '2026-11-03',
    'personal',
    'Solicitud de otra organización.',
    'submitted'
  );

insert into public.tasks (
  id, organization_id, title, description, status, priority,
  assignee_profile_id, due_date, created_by
) values (
  '60000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000002',
  'Tarea de otra organización',
  'Registro sintético para probar aislamiento.',
  'pending',
  'medium',
  '20000000-0000-4000-8000-000000000002',
  '2026-12-15',
  '20000000-0000-4000-8000-000000000002'
);

insert into public.incidents (
  id, organization_id, reference, title, description, status, priority, category,
  requester_profile_id, assignee_profile_id, sla_due_at
) values (
  '70000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000002',
  'INC-B-001', 'Incidencia de otra organización',
  'Registro sintético para comprobar aislamiento.', 'registered', 'medium', 'software',
  '20000000-0000-4000-8000-000000000002', null, now() + interval '72 hours'
);

insert into public.people (
  id, organization_id, display_name, team, position_title, status, role_code
) values (
  '80000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000002',
  'Perfil B', 'Equipo B', 'Puesto sintético', 'active', 'collaborator'
);

insert into public.changelog_entries (
  id, organization_id, version, title, summary, status, published_at, created_by
) values (
  '90000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000002',
  '0.1.0', 'Novedad de otra organización',
  'Contenido sintético para validar el aislamiento.', 'published', now(),
  '20000000-0000-4000-8000-000000000002'
);

insert into public.treasury_entries (
  id, organization_id, entry_date, concept, amount_cents, currency, status, created_by
) values (
  '91000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000002',
  '2026-07-20', 'Movimiento agregado de otra organización', 150000, 'EUR', 'registered',
  '20000000-0000-4000-8000-000000000002'
);

insert into public.payroll_runs (
  id, organization_id, period_start, period_end, people_count, gross_total_cents,
  deduction_total_cents, currency, notes, status, created_by
) values (
  '92000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000002',
  '2026-07-01', '2026-07-31', 12, 350000, 65000, 'EUR',
  'Ciclo agregado de otra organización.', 'validating',
  '20000000-0000-4000-8000-000000000002'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  (select count(*) from public.organizations),
  1::bigint,
  'member can only read their organization'
);

select is(
  (select count(*) from public.treasury_entries where organization_id = '30000000-0000-4000-8000-000000000002'),
  0::bigint,
  'member cannot read Treasury entries from another organization'
);

select lives_ok(
  $$ select public.create_treasury_entry(
    '30000000-0000-4000-8000-000000000001', '2026-07-22',
    'Movimiento agregado de prueba', -24500, 'EUR'
  ) $$,
  'authorized manager can create a Treasury draft'
);

select is(
  (select status from public.treasury_entries where concept = 'Movimiento agregado de prueba'),
  'draft'::public.treasury_entry_status,
  'new Treasury entries start as drafts'
);

select is(
  (select count(*) from public.treasury_events where kind = 'created'),
  1::bigint,
  'Treasury creation produces an immutable event'
);

select lives_ok(
  $$ select public.update_treasury_draft(
    (select id from public.treasury_entries where concept = 'Movimiento agregado de prueba'),
    '30000000-0000-4000-8000-000000000001', '2026-07-23',
    'Movimiento agregado actualizado', -27500, 'EUR'
  ) $$,
  'authorized manager can edit a Treasury draft'
);

select is(
  (select count(*) from public.treasury_events where kind = 'updated'),
  1::bigint,
  'Treasury draft updates are traced'
);

select lives_ok(
  $$ select public.transition_treasury_entry(
    (select id from public.treasury_entries where concept = 'Movimiento agregado actualizado'),
    'registered', 'Registro sintético comprobado.',
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  'authorized manager can register a Treasury draft'
);

select throws_ok(
  $$ select public.transition_treasury_entry(
    (select id from public.treasury_entries where concept = 'Movimiento agregado actualizado'),
    'validated', 'Intento de salto de control.',
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  'P0001', 'invalid treasury transition',
  'Treasury transitions cannot skip reconciliation'
);

select throws_ok(
  $$ insert into public.treasury_entries (
    organization_id, entry_date, concept, amount_cents, currency, created_by
  ) values (
    '30000000-0000-4000-8000-000000000001', '2026-07-24',
    'Inserción directa', 1000, 'EUR', '20000000-0000-4000-8000-000000000001'
  ) $$,
  '42501', null,
  'direct Treasury inserts are denied'
);

select throws_ok(
  $$ select public.create_treasury_entry(
    '30000000-0000-4000-8000-000000000002', '2026-07-24',
    'Intento cruzado', 1000, 'EUR'
  ) $$,
  'P0001', 'permission denied',
  'manager cannot create Treasury entries in another organization'
);

select lives_ok(
  $$ select public.transition_treasury_entry(
    (select id from public.treasury_entries where concept = 'Movimiento agregado actualizado'),
    'reconciled', 'Conciliación sintética completada.',
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  'registered Treasury entry can be reconciled'
);

select lives_ok(
  $$ select public.transition_treasury_entry(
    (select id from public.treasury_entries where concept = 'Movimiento agregado actualizado'),
    'validated', 'Validación sintética completada.',
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  'reconciled Treasury entry can be validated'
);

select lives_ok(
  $$ select public.transition_treasury_entry(
    (select id from public.treasury_entries where concept = 'Movimiento agregado actualizado'),
    'closed', 'Cierre sintético completado.',
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  'validated Treasury entry can be closed'
);

select is(
  (select status from public.treasury_entries where concept = 'Movimiento agregado actualizado'),
  'closed'::public.treasury_entry_status,
  'Treasury workflow persists the closed status'
);

select is(
  (select count(*) from public.treasury_events where entry_id = (select id from public.treasury_entries where concept = 'Movimiento agregado actualizado')),
  6::bigint,
  'Treasury workflow keeps complete immutable traceability'
);

select throws_ok(
  $$ update public.treasury_entries set amount_cents = 10
     where concept = 'Movimiento agregado actualizado' $$,
  '42501', null,
  'direct Treasury updates are denied'
);

select throws_ok(
  $$ select public.transition_treasury_entry(
    (select id from public.treasury_entries where concept = 'Movimiento agregado actualizado'),
    'registered', 'Intento de reapertura.',
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  'P0001', 'invalid treasury transition',
  'closed Treasury entries cannot be reopened'
);

select is(
  (select count(*) from public.payroll_runs where organization_id = '30000000-0000-4000-8000-000000000002'),
  0::bigint,
  'manager cannot read Payroll cycles from another organization'
);

select lives_ok(
  $$ select public.create_payroll_run(
    '30000000-0000-4000-8000-000000000001', '2026-08-01', '2026-08-31',
    20, 580000, 108000, 'EUR', 'Ciclo agregado sintético de prueba.'
  ) $$,
  'authorized manager can create an aggregated Payroll cycle'
);

select is(
  (select net_total_cents from public.payroll_runs where period_start = '2026-08-01'),
  472000::bigint,
  'Payroll net total is derived consistently in the database'
);

select is(
  (select count(*) from public.payroll_events where kind = 'created'),
  1::bigint,
  'Payroll creation produces an immutable event'
);

select lives_ok(
  $$ select public.update_payroll_collecting_run(
    (select id from public.payroll_runs where period_start = '2026-08-01'),
    '30000000-0000-4000-8000-000000000001', '2026-08-01', '2026-08-31',
    21, 600000, 112000, 'EUR', 'Recopilación agregada actualizada.'
  ) $$,
  'authorized manager can update a collecting Payroll cycle'
);

select throws_ok(
  $$ insert into public.payroll_runs (
    organization_id, period_start, period_end, people_count, gross_total_cents,
    deduction_total_cents, currency, created_by
  ) values (
    '30000000-0000-4000-8000-000000000001', '2026-09-01', '2026-09-30',
    20, 1, 0, 'EUR', '20000000-0000-4000-8000-000000000001'
  ) $$,
  '42501', null,
  'direct Payroll inserts are denied'
);

select throws_ok(
  $$ select public.create_payroll_run(
    '30000000-0000-4000-8000-000000000002', '2026-08-01', '2026-08-31',
    20, 580000, 108000, 'EUR', 'Intento cruzado.'
  ) $$,
  'P0001', 'permission denied',
  'manager cannot create Payroll cycles in another organization'
);

select lives_ok(
  $$ select public.transition_payroll_run(
    (select id from public.payroll_runs where period_start = '2026-08-01'),
    'validating', 'Datos agregados comprobados.',
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  'collecting Payroll cycle can enter validation'
);

select throws_ok(
  $$ select public.transition_payroll_run(
    (select id from public.payroll_runs where period_start = '2026-08-01'),
    'reviewed', 'Intento de salto.',
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  'P0001', 'invalid payroll transition',
  'Payroll controls cannot be skipped'
);

select lives_ok($$ select public.transition_payroll_run((select id from public.payroll_runs where period_start = '2026-08-01'), 'calculated', 'Totales agregados calculados.', '30000000-0000-4000-8000-000000000001') $$, 'validated Payroll cycle can be calculated');
select lives_ok($$ select public.transition_payroll_run((select id from public.payroll_runs where period_start = '2026-08-01'), 'reviewed', 'Totales agregados revisados.', '30000000-0000-4000-8000-000000000001') $$, 'calculated Payroll cycle can be reviewed');
select lives_ok($$ select public.transition_payroll_run((select id from public.payroll_runs where period_start = '2026-08-01'), 'closed', 'Ciclo agregado cerrado.', '30000000-0000-4000-8000-000000000001') $$, 'reviewed Payroll cycle can be closed');

select is((select status from public.payroll_runs where period_start = '2026-08-01'), 'closed'::public.payroll_run_status, 'Payroll workflow persists the closed status');
select is((select count(*) from public.payroll_events where run_id = (select id from public.payroll_runs where period_start = '2026-08-01')), 6::bigint, 'Payroll workflow keeps complete immutable traceability');

select throws_ok(
  $$ update public.payroll_runs set gross_total_cents = 10 where period_start = '2026-08-01' $$,
  '42501', null,
  'direct Payroll updates are denied'
);

select throws_ok(
  $$ select public.transition_payroll_run((select id from public.payroll_runs where period_start = '2026-08-01'), 'collecting', 'Intento de reapertura.', '30000000-0000-4000-8000-000000000001') $$,
  'P0001', 'invalid payroll transition',
  'closed Payroll cycles cannot be reopened'
);

select is(
  (
    select count(*)
    from public.leave_requests
    where organization_id = '30000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'member cannot read leave requests from another organization'
);

select lives_ok(
  $$
    insert into public.leave_requests (
      organization_id,
      profile_id,
      start_date,
      end_date,
      leave_type,
      reason,
      status
    ) values (
      '30000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '2026-12-01',
      '2026-12-02',
      'vacation',
      'Solicitud creada por su propietario.',
      'submitted'
    )
  $$,
  'member can create their own leave request'
);

select throws_ok(
  $$
    insert into public.leave_requests (
      organization_id,
      profile_id,
      start_date,
      end_date,
      leave_type,
      reason,
      status
    ) values (
      '30000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000001',
      '2026-12-10',
      '2026-12-11',
      'vacation',
      'Intento entre organizaciones.',
      'submitted'
    )
  $$,
  '42501',
  null,
  'member cannot create a request in another organization'
);

select lives_ok(
  $$
    select public.transition_leave_request(
      '50000000-0000-4000-8000-000000000001',
      'submitted',
      'Borrador enviado a revisión.',
      '30000000-0000-4000-8000-000000000001'
    )
  $$,
  'owner can submit their own draft'
);

select throws_ok(
  $$
    select public.transition_leave_request(
      '50000000-0000-4000-8000-000000000001',
      'submitted',
      'Transición repetida.',
      '30000000-0000-4000-8000-000000000001'
    )
  $$,
  'P0001',
  'invalid leave request transition',
  'invalid transition is rejected'
);

select is(
  (
    select count(*)
    from public.leave_request_events
    where request_id = '50000000-0000-4000-8000-000000000001'
      and to_status = 'submitted'
  ),
  1::bigint,
  'successful transition creates one immutable event'
);

select is(
  (
    select count(*) from public.tasks
    where organization_id = '30000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'member cannot read tasks from another organization'
);

select lives_ok(
  $$
    insert into public.tasks (
      id, organization_id, title, description, status, priority,
      assignee_profile_id, due_date, created_by
    ) values (
      '60000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001',
      'Preparar prueba de tareas',
      'Flujo sintético creado por pgTAP.',
      'pending',
      'high',
      '20000000-0000-4000-8000-000000000001',
      '2026-12-12',
      '20000000-0000-4000-8000-000000000001'
    )
  $$,
  'manager can create a task in their organization'
);

select is(
  (
    select count(*) from public.task_events
    where task_id = '60000000-0000-4000-8000-000000000001'
      and kind = 'created'
  ),
  1::bigint,
  'task creation produces an immutable event'
);

select throws_ok(
  $$
    update public.tasks
    set status = 'completed'
    where id = '60000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'direct status updates are denied'
);

select lives_ok(
  $$
    select public.transition_task(
      '60000000-0000-4000-8000-000000000001',
      'in_progress',
      'Trabajo iniciado mediante el flujo permitido.',
      '30000000-0000-4000-8000-000000000001'
    )
  $$,
  'manager can transition a task through the privileged function'
);

select throws_ok(
  $$
    select public.transition_task(
      '60000000-0000-4000-8000-000000000001',
      'completed',
      'Intento de transición no permitido.',
      '30000000-0000-4000-8000-000000000001'
    )
  $$,
  'P0001',
  'invalid task transition',
  'invalid task transition is rejected'
);

insert into public.tasks (
  id, organization_id, title, description, status, priority, created_by
) values (
  '60000000-0000-4000-8000-000000000003',
  '30000000-0000-4000-8000-000000000001',
  'Segunda tarea sintética',
  'Permite comprobar dependencias dirigidas.',
  'pending',
  'low',
  '20000000-0000-4000-8000-000000000001'
);

insert into public.task_dependencies (
  organization_id, task_id, depends_on_task_id, created_by
) values (
  '30000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000003',
  '60000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001'
);

select throws_ok(
  $$
    insert into public.task_dependencies (
      organization_id, task_id, depends_on_task_id, created_by
    ) values (
      '30000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000003',
      '20000000-0000-4000-8000-000000000001'
    )
  $$,
  'P0001',
  'task dependency cycle detected',
  'directed task dependency cycles are rejected'
);

select is(
  (select count(*) from public.incidents where organization_id = '30000000-0000-4000-8000-000000000002'),
  0::bigint,
  'member cannot read incidents from another organization'
);

select lives_ok(
  $$ insert into public.incidents (
    id, organization_id, reference, title, description, status, priority, category,
    requester_profile_id, assignee_profile_id, sla_due_at
  ) values (
    '70000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'INC-A-001', 'Incidencia sintética', 'Caso creado para validar políticas locales.',
    'registered', 'high', 'access',
    '20000000-0000-4000-8000-000000000001',
    null, now() + interval '24 hours'
  ) $$,
  'manager can create an incident in their organization'
);

select is(
  (select count(*) from public.incident_events where incident_id = '70000000-0000-4000-8000-000000000001' and kind = 'created'),
  1::bigint,
  'incident creation produces an immutable event'
);

select lives_ok(
  $$ select public.transition_incident(
    '70000000-0000-4000-8000-000000000001', 'triaged',
    'Prioridad revisada con datos sintéticos.',
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  'manager can transition an incident through the privileged function'
);

select throws_ok(
  $$ select public.transition_incident(
    '70000000-0000-4000-8000-000000000001', 'resolved',
    'Intento de transición no permitido.',
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  'P0001', 'invalid incident transition',
  'invalid incident transition is rejected'
);

select throws_ok(
  $$ select public.transition_incident(
    '70000000-0000-4000-8000-000000000001', 'assigned',
    'Intento de asignación sin responsable.',
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  'P0001', 'incident assignment required',
  'incident cannot advance to assigned without an assignee'
);

select throws_ok(
  $$ update public.incidents set status = 'closed'
     where id = '70000000-0000-4000-8000-000000000001' $$,
  '42501', null,
  'direct incident status updates are denied'
);

select throws_ok(
  $$ insert into public.incidents (
    organization_id, reference, title, description, requester_profile_id
  ) values (
    '30000000-0000-4000-8000-000000000002', 'INC-X-001',
    'Intento cruzado', 'Caso sintético que debe ser rechazado.',
    '20000000-0000-4000-8000-000000000001'
  ) $$,
  '42501', null,
  'manager cannot create an incident in another organization'
);

select is(
  (select count(*) from public.people where organization_id = '30000000-0000-4000-8000-000000000002'),
  0::bigint,
  'member cannot read people from another organization'
);

select lives_ok(
  $$ insert into public.people (
    id, organization_id, display_name, team, position_title, status, role_code
  ) values (
    '80000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'Perfil sintético', 'Equipo demo', 'Puesto demostrativo', 'invited', 'viewer'
  ) $$,
  'manager can add a synthetic person profile'
);

select is(
  (select count(*) from public.people_events where person_id = '80000000-0000-4000-8000-000000000001' and kind = 'created'),
  1::bigint,
  'person creation produces an immutable event'
);

select lives_ok(
  $$ update public.people set status = 'active', role_code = 'collaborator'
     where id = '80000000-0000-4000-8000-000000000001' $$,
  'manager can update person status and role in their organization'
);

select is(
  (select count(*) from public.changelog_entries where organization_id = '30000000-0000-4000-8000-000000000002'),
  0::bigint,
  'member cannot read changelog entries from another organization'
);

select lives_ok(
  $$ insert into public.changelog_entries (
    id, organization_id, version, title, summary, status, created_by
  ) values (
    '90000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    '0.5.0', 'Novedad sintética',
    'Contenido demostrativo preparado para revisión.', 'draft',
    '20000000-0000-4000-8000-000000000001'
  ) $$,
  'manager can create a changelog draft'
);

select is(
  (select count(*) from public.changelog_events where entry_id = '90000000-0000-4000-8000-000000000001' and to_status = 'draft'),
  1::bigint,
  'changelog creation produces an immutable event'
);

select throws_ok(
  $$ update public.changelog_entries set status = 'published'
     where id = '90000000-0000-4000-8000-000000000001' $$,
  '42501', null,
  'direct changelog status updates are denied'
);

select lives_ok(
  $$ select public.transition_changelog_entry(
    '90000000-0000-4000-8000-000000000001', 'in_review',
    'Contenido enviado a revisión.',
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  'manager can submit a changelog entry for review'
);

select lives_ok(
  $$ select public.transition_changelog_entry(
    '90000000-0000-4000-8000-000000000001', 'published',
    'Contenido sintético revisado.',
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  'manager can publish a reviewed changelog entry'
);

select throws_ok(
  $$ select public.transition_changelog_entry(
    '90000000-0000-4000-8000-000000000001', 'draft',
    'Intento de volver a borrador.',
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  'P0001', 'invalid changelog transition',
  'published changelog entries cannot return to draft'
);

select isnt(
  (select published_at from public.changelog_entries where id = '90000000-0000-4000-8000-000000000001'),
  null::timestamptz,
  'publishing records the publication timestamp'
);

select is(
  (select count(*) from public.audit_events where entity_id = '90000000-0000-4000-8000-000000000001'),
  2::bigint,
  'changelog transitions are audited'
);

select lives_ok(
  $$ update public.organizations set name = 'Organización A actualizada'
     where id = '30000000-0000-4000-8000-000000000001' $$,
  'admin can update organization identity'
);

select is(
  (select count(*) from public.audit_events where event_type = 'organizations.update'),
  1::bigint,
  'organization identity changes are audited'
);

select lives_ok(
  $$ select public.update_role_permissions(
    '40000000-0000-4000-8000-000000000003',
    array['tasks.items.view', 'changelog.entries.view'],
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  'admin can update permissions of an editable role'
);

select is(
  (select count(*) from public.role_permissions where role_id = '40000000-0000-4000-8000-000000000003'),
  2::bigint,
  'role permission replacement is exact'
);

select lives_ok(
  $$ select public.update_membership_access(
    (select id from public.memberships where profile_id = '20000000-0000-4000-8000-000000000003'),
    '40000000-0000-4000-8000-000000000003', 'active',
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  'admin can activate another membership'
);

select is(
  (select status from public.memberships where profile_id = '20000000-0000-4000-8000-000000000003'),
  'active'::public.membership_status,
  'membership activation is persisted'
);

select throws_ok(
  $$ select public.update_membership_access(
    (select id from public.memberships where profile_id = '20000000-0000-4000-8000-000000000001'),
    '40000000-0000-4000-8000-000000000003', 'suspended',
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  'P0001', 'self access changes are not allowed',
  'admin cannot change their own access'
);

select lives_ok(
  $$ select public.update_module_setting(
    'novedades', true, 7,
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  'admin can configure module activation and order'
);

select cmp_ok(
  (select count(*) from public.audit_events where event_type like 'module_settings.%'),
  '>=', 1::bigint,
  'module configuration changes are audited'
);

select is(
  (select count(*) from public.audit_events where event_type = 'role.permissions_updated'),
  1::bigint,
  'role permission changes are audited'
);

select is(
  (select count(*) from public.audit_events where event_type = 'membership.access_updated'),
  1::bigint,
  'membership access changes are audited'
);

select * from finish();
rollback;
