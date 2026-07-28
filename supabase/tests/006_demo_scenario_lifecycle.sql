begin;
select plan(9);

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
values (
  'd0000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'lifecycle-user@example.test',
  '{"provider":"google","providers":["google"]}',
  '{}',
  now(),
  now()
);

select set_config(
  'request.jwt.claims',
  '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    select status.free_plan_read_only_threshold_bytes
    from public.get_demo_workspace_status(
      (select organization_id from public.memberships where profile_id = auth.uid())
    ) status
  ),
  524288000::bigint,
  'workspace status exposes the 500 MB read-only threshold'
);
select ok(
  (
    select status.database_size_bytes > 0
    from public.get_demo_workspace_status(
      (select organization_id from public.memberships where profile_id = auth.uid())
    ) status
  ),
  'workspace status reports the current database size'
);
select lives_ok(
  format(
    'select public.touch_demo_workspace(%L)',
    (select organization_id from public.memberships where profile_id = auth.uid())
  ),
  'an active member can update workspace activity'
);

reset role;

insert into public.treasury_entries (
  organization_id,
  entry_date,
  concept,
  amount_cents,
  currency,
  status,
  created_by
)
select
  organization_id,
  current_date,
  'Movimiento temporal para restauración',
  1000,
  'EUR',
  'draft',
  'd0000000-0000-4000-8000-000000000001'
from public.memberships
where profile_id = 'd0000000-0000-4000-8000-000000000001';

set local role authenticated;

select is(
  (
    select count(*)
    from public.treasury_entries
    where organization_id = (
      select organization_id from public.memberships where profile_id = auth.uid()
    )
  ),
  361::bigint,
  'the temporary Treasury record is visible before restoration'
);
select lives_ok(
  format(
    'select public.restore_demo_scenario(%L, %L)',
    (select organization_id from public.memberships where profile_id = auth.uid()),
    'tesoreria'
  ),
  'an administrator can restore one scenario module'
);
select is(
  (
    select count(*)
    from public.treasury_entries
    where organization_id = (
      select organization_id from public.memberships where profile_id = auth.uid()
    )
  ),
  360::bigint,
  'module restoration returns Treasury to its standard volume'
);
select is(
  (
    select count(*)
    from public.audit_events
    where organization_id = (
      select organization_id from public.memberships where profile_id = auth.uid()
    )
      and event_type = 'demo.scenario_restored'
  ),
  1::bigint,
  'scenario restoration is audited'
);

reset role;

select function_privs_are(
  'public',
  'restore_demo_scenario',
  array['uuid', 'text'],
  'anon',
  array[]::text[],
  'anonymous users cannot restore a scenario'
);
select function_privs_are(
  'private',
  'cleanup_inactive_demo_workspaces',
  array['timestamptz'],
  'authenticated',
  array[]::text[],
  'workspace users cannot execute retention cleanup'
);

select * from finish();
rollback;
