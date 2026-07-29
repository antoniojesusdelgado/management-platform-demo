begin;
select plan(18);

select has_table(
  'public',
  'analytics_service_dimensions',
  'stable analytics service dimensions are persisted'
);

select has_table(
  'public',
  'scenario_evolution_events',
  'Scenario V7 evolution has an audit table'
);

select has_column(
  'public',
  'organizations',
  'scenario_generated_through_date',
  'organizations track the generated horizon'
);

select has_column(
  'public',
  'people',
  'employment_start_date',
  'people expose professional start dates'
);

select has_column(
  'public',
  'people',
  'employment_end_date',
  'people expose professional end dates'
);

select has_column(
  'public',
  'incidents',
  'analytics_service_code',
  'incidents reference a stable service code'
);

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.analytics_service_dimensions'::regclass
  ),
  true,
  'analytics service dimensions enforce RLS'
);

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.scenario_evolution_events'::regclass
  ),
  true,
  'scenario evolution events enforce RLS'
);

select is(
  has_function_privilege(
    'anon',
    'public.ensure_demo_scenario_current(uuid)',
    'EXECUTE'
  ),
  false,
  'anonymous users cannot advance Scenario V7'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.ensure_demo_scenario_current(uuid)',
    'EXECUTE'
  ),
  true,
  'authenticated users can invoke the guarded Scenario V7 RPC'
);

select is(
  has_function_privilege(
    'public',
    'private.generate_demo_scenario_v7_interval(uuid,uuid,date,date)',
    'EXECUTE'
  ),
  false,
  'PUBLIC cannot execute the private generator'
);

select ok(
  (
    select function.prosecdef
      and function.proconfig @> array['search_path=""']
    from pg_proc function
    where function.oid =
      'public.ensure_demo_scenario_current(uuid)'::regprocedure
  ),
  'the public Scenario V7 RPC is security definer with an empty search path'
);

select ok(
  position(
    'auth.uid()' in pg_get_functiondef(
      'public.ensure_demo_scenario_current(uuid)'::regprocedure
    )
  ) > 0,
  'the public Scenario V7 RPC validates the caller identity'
);

select is(
  has_function_privilege(
    'anon',
    'public.get_analytics_snapshot(uuid,text,uuid,text,uuid,text,text,text)',
    'EXECUTE'
  ),
  false,
  'anonymous users cannot execute analytics aggregation'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.get_analytics_snapshot(uuid,text,uuid,text,uuid,text,text,text)',
    'EXECUTE'
  ),
  true,
  'authenticated users can invoke guarded analytics aggregation'
);

select ok(
  (
    select function.prosecdef
      and function.proconfig @> array['search_path=""']
      and position('auth.uid()' in pg_get_functiondef(function.oid)) > 0
    from pg_proc function
    where function.oid =
      'public.get_analytics_snapshot(uuid,text,uuid,text,uuid,text,text,text)'
        ::regprocedure
  ),
  'analytics aggregation is guarded and uses an empty search path'
);

select is(
  (
    select count(*)
    from public.saved_analytics_views
    where filters ? 'service'
      and jsonb_typeof(filters -> 'service') not in ('string', 'null')
  ),
  0::bigint,
  'saved service filters contain only stable strings or null'
);

select is(
  (
    select count(*)
    from (
      select title as value from public.tasks
      union all
      select description from public.incidents
      union all
      select reason from public.leave_requests
      union all
      select concept from public.treasury_entries
      union all
      select title from public.changelog_entries
      union all
      select summary from public.changelog_entries
    ) copy
    where copy.value ~ '(Ãƒ|Ã‚|Ã¢|ï¿½)'
  ),
  0::bigint,
  'operational copy contains no known mojibake signatures'
);

select * from finish();
rollback;
