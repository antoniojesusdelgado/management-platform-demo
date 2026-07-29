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
  'c0000000-0000-4000-8000-000000000013',
  'authenticated',
  'authenticated',
  'maintenance-user@example.test',
  '{"provider":"google","providers":["google"]}',
  '{}',
  now(),
  now()
);

select has_column(
  'public',
  'people',
  'employment_contract_type',
  'people expose the employment contract type'
);

select col_type_is(
  'public',
  'people',
  'employment_contract_type',
  'text',
  'employment contract type uses a stable text code'
);

select ok(
  not exists (
    select 1
    from public.people
    where employment_contract_type not in (
      'indefinite_ordinary',
      'permanent_discontinuous',
      'temporary_production',
      'temporary_substitution'
    )
  ),
  'all employment contract codes are supported'
);

select is(
  (select count(*) from public.people where employment_contract_type = 'indefinite_ordinary'),
  23::bigint,
  'the scenario contains 23 ordinary indefinite contracts'
);

select is(
  (select count(*) from public.people where employment_contract_type = 'permanent_discontinuous'),
  3::bigint,
  'the scenario contains 3 permanent-discontinuous contracts'
);

select is(
  (select count(*) from public.people where employment_contract_type = 'temporary_production'),
  4::bigint,
  'the scenario contains 4 production temporary contracts'
);

select is(
  (select count(*) from public.people where employment_contract_type = 'temporary_substitution'),
  2::bigint,
  'the scenario contains 2 substitution temporary contracts'
);

select is(
  (select count(*) from public.tasks where status = 'completed'),
  90::bigint,
  'the scenario contains 90 completed tasks'
);

select ok(
  not exists (
    select 1
    from public.projects project
    where (
      project.status = 'completed'
      and exists (
        select 1
        from public.tasks task
        where task.project_id = project.id
          and task.status <> 'completed'
      )
    ) or (
      project.status <> 'completed'
      and not exists (
        select 1
        from public.tasks task
        where task.project_id = project.id
          and task.status <> 'completed'
      )
    )
  ),
  'project state agrees with the completion state of its tasks'
);

select is(
  has_function_privilege(
    'anon',
    'public.restore_demo_scenario_v6()',
    'EXECUTE'
  ),
  false,
  'anonymous users cannot restore Scenario V6'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.restore_demo_scenario_v6()',
    'EXECUTE'
  ),
  false,
  'authenticated users cannot invoke the superseded Scenario V6 restore'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'people'
      and indexdef like '%employment_contract_type%'
  ),
  'employment contract filtering is indexed'
);

select * from finish();
rollback;
