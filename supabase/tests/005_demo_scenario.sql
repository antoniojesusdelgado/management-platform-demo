begin;
select plan(12);

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
  'c0000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'scenario-user@example.test',
  '{"provider":"google","providers":["google"]}',
  '{}',
  now(),
  now()
);

select is(
  (
    select scenario_version
    from public.organizations organization
    join public.memberships membership
      on membership.organization_id = organization.id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  1,
  'the provisioned workspace records its scenario version'
);

select is(
  (
    select count(*)
    from public.people person
    join public.memberships membership
      on membership.organization_id = person.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  24::bigint,
  'the scenario contains 24 synthetic people'
);
select is(
  (
    select count(distinct person.team)
    from public.people person
    join public.memberships membership
      on membership.organization_id = person.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  4::bigint,
  'the scenario contains four generic teams'
);
select is(
  (
    select count(*)
    from public.projects project
    join public.memberships membership
      on membership.organization_id = project.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  8::bigint,
  'the scenario contains eight projects'
);
select is(
  (
    select count(*)
    from public.tasks task
    join public.memberships membership
      on membership.organization_id = task.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  180::bigint,
  'the scenario contains 180 tasks'
);
select is(
  (
    select count(*)
    from public.leave_requests request
    join public.memberships membership
      on membership.organization_id = request.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  96::bigint,
  'the scenario contains 96 leave requests'
);
select is(
  (
    select count(*)
    from public.incidents incident
    join public.memberships membership
      on membership.organization_id = incident.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  120::bigint,
  'the scenario contains 120 incidents'
);
select is(
  (
    select count(*)
    from public.treasury_entries entry
    join public.memberships membership
      on membership.organization_id = entry.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  540::bigint,
  'the scenario contains 540 synthetic treasury entries'
);
select is(
  (
    select count(*)
    from public.payroll_runs run
    join public.memberships membership
      on membership.organization_id = run.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  18::bigint,
  'the scenario contains 18 aggregate payroll cycles'
);
select is(
  (
    select count(*)
    from public.changelog_entries entry
    join public.memberships membership
      on membership.organization_id = entry.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  24::bigint,
  'the scenario contains 24 changelog entries'
);
select is(
  (
    select count(*)
    from public.people
    where display_name ~* '(BBVA|Santander|A3|Cibervoluntarios)'
       or position_title ~* '(BBVA|Santander|A3|Cibervoluntarios)'
  ),
  0::bigint,
  'the scenario contains no prohibited provider or organization labels'
);

select lives_ok(
  format(
    'select private.seed_standard_demo_scenario(%L, %L)',
    (
      select organization_id
      from public.memberships
      where profile_id = 'c0000000-0000-4000-8000-000000000001'
    ),
    'c0000000-0000-4000-8000-000000000001'
  ),
  'repeating the scenario seed is idempotent'
);

select * from finish();
rollback;
