begin;
select plan(3);

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'a1000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'analytics-user@example.test',
  '{"provider":"google","providers":["google"]}',
  '{}',
  now(),
  now()
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    select count(*)
    from public.module_settings
    where organization_id = (
      select organization_id
      from public.memberships
      where profile_id = auth.uid()
    )
      and module_id = 'analitica'
      and enabled
  ),
  1::bigint,
  'the Control Center is enabled for a newly provisioned workspace'
);
select ok(
  private.has_permission(
    (
      select organization_id
      from public.memberships
      where profile_id = auth.uid()
    ),
    'analytics.dashboards.view'
  ),
  'the real demo administrator can view analytics'
);

reset role;
select is(
  has_table_privilege('anon', 'public.projects', 'SELECT'),
  false,
  'the Control Center does not expose operational tables to anonymous users'
);

select * from finish();
rollback;
