begin;
select plan(22);

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
  3,
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
  10::bigint,
  'the scenario contains ten projects'
);
select is(
  (
    select count(*)
    from public.tasks task
    join public.memberships membership
      on membership.organization_id = task.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  120::bigint,
  'the scenario contains 120 tasks'
);
select is(
  (
    select count(*)
    from public.leave_requests request
    join public.memberships membership
      on membership.organization_id = request.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  72::bigint,
  'the scenario contains 72 leave requests'
);
select is(
  (
    select count(*)
    from public.incidents incident
    join public.memberships membership
      on membership.organization_id = incident.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  60::bigint,
  'the scenario contains 60 incidents'
);
select is(
  (
    select count(*)
    from public.treasury_entries entry
    join public.memberships membership
      on membership.organization_id = entry.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
  ),
  240::bigint,
  'the scenario contains 240 synthetic treasury entries'
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
  9::bigint,
  'the scenario contains nine changelog entries'
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
      or balance::numeric / income not between 0.10 and 0.18
  ),
  0::bigint,
  'every synthetic treasury month remains positive with a 10 to 18 percent margin'
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

select is(
  (
    select jsonb_object_agg(status, amount)
    from (
      select project.status, count(*) as amount
      from public.projects project
      join public.memberships membership
        on membership.organization_id = project.organization_id
      where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
      group by project.status
    ) distribution
  ),
  '{"active": 5, "completed": 3, "on_hold": 1, "planned": 1}'::jsonb,
  'projects have the balanced V3 status distribution'
);
select is(
  (
    select jsonb_object_agg(status, amount)
    from (
      select task.status, count(*) as amount
      from public.tasks task
      join public.memberships membership
        on membership.organization_id = task.organization_id
      where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
      group by task.status
    ) distribution
  ),
  '{"blocked": 5, "completed": 70, "in_progress": 15, "in_review": 10, "pending": 20}'::jsonb,
  'tasks have the balanced V3 status distribution'
);
select is(
  (
    select count(*)
    from public.incidents incident
    join public.memberships membership
      on membership.organization_id = incident.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
      and incident.status not in ('resolved', 'closed')
  ),
  12::bigint,
  'the scenario has twelve open incidents'
);
select is(
  (
    select count(*)
    from public.incidents incident
    join public.memberships membership
      on membership.organization_id = incident.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
      and incident.priority = 'critical'
  ),
  2::bigint,
  'the complete incident history contains two critical cases'
);
select ok(
  (
    select count(*) <= 12
    from public.treasury_entries entry
    join public.memberships membership
      on membership.organization_id = entry.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
      and entry.status in ('draft', 'registered')
  ),
  'at most five percent of Treasury entries are pending validation'
);
select is(
  (
    select count(*)
    from public.payroll_runs run
    join public.memberships membership
      on membership.organization_id = run.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
      and run.status = 'closed'
  ),
  16::bigint,
  'sixteen payroll cycles are closed'
);
select is(
  (
    select count(*)
    from public.changelog_entries entry
    join public.memberships membership
      on membership.organization_id = entry.organization_id
    where membership.profile_id = 'c0000000-0000-4000-8000-000000000001'
      and entry.status = 'published'
  ),
  9::bigint,
  'all nine changelog entries are published'
);

select * from finish();
rollback;
