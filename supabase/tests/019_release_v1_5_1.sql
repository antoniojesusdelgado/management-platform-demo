begin;

select plan(9);

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values (
  'f5100000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'release-v1-5-1-user@example.test',
  '{"provider":"google","providers":["google"]}',
  '{}',
  now(),
  now()
);

select has_function(
  'private',
  'ensure_v1_5_1_releases',
  array['uuid', 'uuid'],
  'v1.5.1 keeps release alignment in a private helper'
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
  '{"sub":"f5100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  'select public.ensure_public_demo_workspace()',
  'a new Google identity receives an isolated demonstration workspace'
);

select lives_ok(
  format(
    'select public.ensure_demo_scenario_current(%L)',
    (
      select organization_id
      from public.memberships
      where profile_id = auth.uid()
    )
  ),
  'the current scenario appends the complete release history'
);

select is(
  (
    select count(*)
    from public.changelog_entries
    where organization_id = (
      select organization_id
      from public.memberships
      where profile_id = auth.uid()
    )
      and version in ('1.4.0', '1.4.1', '1.5.0', '1.5.1')
  ),
  4::bigint,
  'the authenticated workspace contains every release after v1.3.2 once'
);

select results_eq(
  $$
    select title, published_at::date
    from public.changelog_entries
    where organization_id = (
      select organization_id
      from public.memberships
      where profile_id = auth.uid()
    )
      and version = '1.5.1'
  $$,
  $$ values ('Novedades siempre al día'::text, date '2026-08-07') $$,
  'v1.5.1 exposes the expected user-facing title and publication date'
);

reset role;

update public.changelog_entries
set title = 'Título histórico conservado'
where organization_id = (
  select organization_id
  from public.memberships
  where profile_id = 'f5100000-0000-4000-8000-000000000001'
)
  and version = '1.3.2';

select lives_ok(
  format(
    'select private.ensure_v1_3_2_release(%L, %L)',
    (
      select organization_id
      from public.memberships
      where profile_id = 'f5100000-0000-4000-8000-000000000001'
    ),
    'f5100000-0000-4000-8000-000000000001'
  ),
  'the complete release alignment can run repeatedly without conflicts'
);

select is(
  (
    select title
    from public.changelog_entries
    where organization_id = (
      select organization_id
      from public.memberships
      where profile_id = 'f5100000-0000-4000-8000-000000000001'
    )
      and version = '1.3.2'
  ),
  'Título histórico conservado',
  'release alignment preserves an existing historical entry'
);

update public.changelog_entries
set title = 'Título editorial conservado'
where organization_id = (
  select organization_id
  from public.memberships
  where profile_id = 'f5100000-0000-4000-8000-000000000001'
)
  and version = '1.5.0';

select is(
  (
    select title
    from public.changelog_entries
    where organization_id = (
      select organization_id
      from public.memberships
      where profile_id = 'f5100000-0000-4000-8000-000000000001'
    )
      and version = '1.5.0'
  ),
  'Título editorial conservado',
  'an idempotent rerun preserves an existing editorial entry'
);

select * from finish();
rollback;
