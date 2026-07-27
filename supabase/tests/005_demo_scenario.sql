begin;
select plan(15);

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
  2,
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
  32::bigint,
  'the scenario contains 32 synthetic people'
);
select is(
  (
    select count(distinct person.team)
    from public.people person
    join public.memberships membership
      on membership.organization_id = person.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  6::bigint,
  'the scenario contains six operating teams'
);
select is(
  (
    select count(*)
    from public.projects project
    join public.memberships membership
      on membership.organization_id = project.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  12::bigint,
  'the scenario contains twelve projects'
);
select is(
  (
    select count(*)
    from public.tasks task
    join public.memberships membership
      on membership.organization_id = task.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  320::bigint,
  'the scenario contains 320 tasks'
);
select is(
  (
    select count(*)
    from public.leave_requests request
    join public.memberships membership
      on membership.organization_id = request.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  144::bigint,
  'the scenario contains 144 leave requests'
);
select is(
  (
    select count(*)
    from public.incidents incident
    join public.memberships membership
      on membership.organization_id = incident.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  240::bigint,
  'the scenario contains 240 incidents'
);
select is(
  (
    select count(*)
    from public.treasury_entries entry
    join public.memberships membership
      on membership.organization_id = entry.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  720::bigint,
  'the scenario contains 720 synthetic treasury entries'
);
select is(
  (
    select count(*)
    from public.payroll_runs run
    join public.memberships membership
      on membership.organization_id = run.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  24::bigint,
  'the scenario contains 24 aggregate payroll cycles'
);
select is(
  (
    select count(*)
    from public.changelog_entries entry
    join public.memberships membership
      on membership.organization_id = entry.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  36::bigint,
  'the scenario contains 36 changelog entries'
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

select is(
  (
    select count(*)
    from public.people
    where display_name ~* '^persona[[:space:]]+[0-9]+$'
  ),
  0::bigint,
  'people use natural synthetic names rather than numbered placeholders'
);

select is(
  (
    with monthly_cash as (
      select
        date_trunc('month', entry.entry_date) as month,
        sum(entry.amount_cents) as balance,
        sum(entry.amount_cents) filter (where entry.amount_cents > 0) as income
      from public.treasury_entries entry
      join public.memberships membership
        on membership.organization_id = entry.organization_id
      where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
      group by 1
    )
    select count(*)
    from monthly_cash
    where balance <= 0
      or balance::numeric / income not between 0.08 and 0.22
  ),
  0::bigint,
  'every synthetic treasury month remains positive with an 8 to 22 percent margin'
);

select is(
  (
    select count(*)
    from public.incidents incident
    join public.memberships membership
      on membership.organization_id = incident.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
      and (
        incident.affected_service = ''
        or incident.impact_scope = ''
        or incident.detection_channel = ''
      )
  ),
  0::bigint,
  'incidents include service, scope and detection context'
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
