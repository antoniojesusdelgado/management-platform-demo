begin;
select plan(13);

select has_column(
  'public',
  'people',
  'manager_person_id',
  'people expose an optional manager reference'
);

select has_table(
  'public',
  'payroll_participants',
  'payroll participants exist'
);

select has_column(
  'public',
  'payroll_participants',
  'inclusion_status',
  'payroll participants record inclusion status'
);

select has_column(
  'public',
  'payroll_participants',
  'validation_status',
  'payroll participants record validation status'
);

select ok(
  not exists (
    select 1
    from information_schema.columns column_definition
    where column_definition.table_schema = 'public'
      and column_definition.table_name = 'payroll_participants'
      and column_definition.column_name in (
        'gross_total_cents',
        'deduction_total_cents',
        'net_total_cents',
        'employer_cost_total_cents',
        'salary',
        'amount'
      )
  ),
  'payroll participants contain no individual monetary columns'
);

select is(
  (
    select table_definition.relrowsecurity
    from pg_class table_definition
    join pg_namespace table_namespace
      on table_namespace.oid = table_definition.relnamespace
    where table_namespace.nspname = 'public'
      and table_definition.relname = 'payroll_participants'
  ),
  true,
  'payroll participants enforce row level security'
);

select is(
  (
    select count(*)
    from pg_policies policy
    where policy.schemaname = 'public'
      and policy.tablename = 'payroll_participants'
      and policy.cmd = 'SELECT'
      and policy.roles = array['authenticated'::name]
  ),
  1::bigint,
  'payroll participants have one authenticated read policy'
);

select is(
  has_table_privilege('anon', 'public.payroll_participants', 'SELECT'),
  false,
  'anonymous users cannot read payroll participants'
);

select is(
  has_table_privilege('authenticated', 'public.payroll_participants', 'SELECT'),
  true,
  'authenticated users can read permitted payroll participants'
);

select is(
  has_table_privilege(
    'authenticated',
    'public.payroll_participants',
    'INSERT, UPDATE, DELETE'
  ),
  false,
  'authenticated users cannot mutate payroll participants directly'
);

select is(
  has_function_privilege(
    'anon',
    'public.restore_demo_scenario_v5()',
    'EXECUTE'
  ),
  false,
  'anonymous users cannot restore Scenario V5'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.restore_demo_scenario_v5()',
    'EXECUTE'
  ),
  true,
  'authenticated users can invoke the guarded Scenario V5 restore'
);

select ok(
  not exists (
    select 1
    from public.people person
    where person.manager_person_id = person.id
  ),
  'the generated people hierarchy has no self references'
);

select * from finish();
rollback;
