begin;
select plan(10);

select has_table(
  'public',
  'saved_analytics_views',
  'saved analytics views table exists'
);
select has_table(
  'public',
  'workspace_configuration',
  'workspace configuration table exists'
);
select is(
  has_table_privilege('anon', 'public.saved_analytics_views', 'SELECT'),
  false,
  'anonymous users cannot read saved analytics views'
);
select is(
  has_function_privilege(
    'authenticated',
    'private.run_scheduled_integrations()',
    'EXECUTE'
  ),
  false,
  'authenticated users cannot execute the scheduled worker'
);
select is(
  (
    select count(*)
    from cron.job
    where jobname = 'nightly-neutral-integrations'
      and schedule = '15 2 * * *'
  ),
  1::bigint,
  'the neutral integration worker is scheduled once at 02:15 UTC'
);

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'a2000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'analytics-owner@example.test',
  '{"provider":"google","providers":["google"]}',
  '{}',
  now(),
  now()
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a2000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.workspace_configuration),
  1::bigint,
  'workspace configuration is provisioned automatically'
);
select lives_ok(
  format(
    'insert into public.saved_analytics_views
      (organization_id, profile_id, name, module_id, filters)
     values (%L, %L, %L, %L, %L::jsonb)',
    (select organization_id from public.memberships where profile_id = auth.uid()),
    auth.uid(),
    'Portfolio activo',
    'centro-control',
    '{"projectId":"all"}'
  ),
  'a user can save an owned analytics view'
);
select is(
  (select count(*) from public.saved_analytics_views),
  1::bigint,
  'the saved analytics view is visible to its owner'
);
select throws_ok(
  format(
    'insert into public.saved_analytics_views
      (organization_id, profile_id, name, module_id, filters)
     values (%L, %L, %L, %L, %L::jsonb)',
    (select organization_id from public.memberships where profile_id = auth.uid()),
    'a2000000-0000-4000-8000-000000000099',
    'Vista ajena',
    'centro-control',
    '{}'
  ),
  '42501',
  null,
  'a user cannot save an analytics view for another profile'
);

reset role;
select lives_ok(
  'select private.run_scheduled_integrations()',
  'the privileged scheduled worker runs without an authenticated session'
);

select * from finish();
rollback;
