begin;
select plan(12);

select has_table('public', 'integration_connectors', 'connectors table exists');
select has_table('public', 'integration_runs', 'runs table exists');
select has_table('public', 'integration_run_items', 'run items table exists');
select has_table('public', 'integration_mappings', 'mappings table exists');
select has_table('public', 'data_quality_issues', 'quality issues table exists');
select is(
  has_table_privilege('anon', 'public.integration_runs', 'SELECT'),
  false,
  'anonymous users cannot inspect integration runs'
);

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'f0000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'integrations-user@example.test',
  '{"provider":"google","providers":["google"]}',
  '{}',
  now(),
  now()
);

select set_config(
  'request.jwt.claims',
  '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.integration_connectors),
  4::bigint,
  'a workspace receives four neutral connectors'
);
select is(
  (select min(schedule_cron) from public.integration_connectors),
  '15 2 * * *',
  'the inactive schedule is represented as 02:15 UTC'
);
select lives_ok(
  format(
    'select public.simulate_integration_run(%L, %L)',
    (select organization_id from public.memberships where profile_id = auth.uid()),
    (select id from public.integration_connectors where code = 'financial_source_a')
  ),
  'an authorized user can run a neutral simulation'
);
select is(
  (select count(*) from public.integration_runs),
  1::bigint,
  'the simulation creates one run'
);
select is(
  (select processed_count from public.integration_runs),
  36,
  'the financial simulation records its processed volume'
);
select is(
  (select count(*) from public.integration_run_items),
  36::bigint,
  'every processed record has a safe run item'
);

select * from finish();
rollback;
