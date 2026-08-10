begin;

select plan(7);

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values (
  'f6100000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'release-v1-6-user@example.test',
  '{"provider":"google","providers":["google"]}',
  '{}',
  now(),
  now()
);

select has_function(
  'private',
  'ensure_v1_5_1_releases',
  array['uuid', 'uuid'],
  'v1.6.0 extends the private release alignment helper'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'private.ensure_v1_5_1_releases(uuid,uuid)'::regprocedure,
    'EXECUTE'
  ),
  'authenticated users cannot call the private release helper'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"f6100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  'select public.ensure_public_demo_workspace()',
  'a new identity receives an isolated demonstration workspace'
);

select lives_ok(
  format(
    'select public.ensure_demo_scenario_current(%L)',
    (select organization_id from public.memberships where profile_id = auth.uid())
  ),
  'the current scenario appends the v1.6.0 release'
);

select is(
  (
    select count(*)
    from public.changelog_entries
    where organization_id = (
      select organization_id from public.memberships where profile_id = auth.uid()
    ) and version = '1.6.0'
  ),
  1::bigint,
  'the workspace contains v1.6.0 once'
);

select results_eq(
  $$
    select title, published_at::date
    from public.changelog_entries
    where organization_id = (
      select organization_id from public.memberships where profile_id = auth.uid()
    ) and version = '1.6.0'
  $$,
  $$ values ('Encuentra y prioriza tu trabajo'::text, date '2026-08-10') $$,
  'v1.6.0 exposes the expected user-facing title and publication date'
);

reset role;

select lives_ok(
  format(
    'select private.ensure_v1_5_1_releases(%L, %L)',
    (select organization_id from public.memberships where profile_id = 'f6100000-0000-4000-8000-000000000001'),
    'f6100000-0000-4000-8000-000000000001'
  ),
  'release alignment remains idempotent'
);

select * from finish();
rollback;
