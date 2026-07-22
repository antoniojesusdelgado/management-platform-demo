begin;
select plan(14);

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
  'tasks.items.manage'
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

select * from finish();
rollback;
