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
  'f3000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'release-v1-3-user@example.test',
  '{"provider":"google","providers":["google"]}',
  '{}',
  now(),
  now()
);

select is(
  (
    select theme
    from public.profiles
    where id = 'f3000000-0000-4000-8000-000000000001'
  ),
  'light',
  'new profiles default to the light theme'
);

select throws_ok(
  $$
    update public.profiles
    set theme = 'system'
    where id = 'f3000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'the removed system theme cannot be persisted'
);

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
      union all
      select note from public.people_events
    ) copy
    where copy.value ~ '(Ãƒ|Ã‚|Ã¢|ï¿½)'
  ),
  0::bigint,
  'operational copy contains no known mojibake signatures'
);

select is(
  (
    select count(*)
    from public.organizations organization
    where exists (
      select 1
      from public.memberships membership
      where membership.organization_id = organization.id
    )
      and exists (
      select 1
      from public.changelog_entries entry
      where entry.organization_id = organization.id
        and entry.version = '1.3.0'
        and entry.status = 'published'
    )
  ),
  (
    select count(*)
    from public.organizations organization
    where exists (
      select 1
      from public.memberships membership
      where membership.organization_id = organization.id
    )
  ),
  'v1.3.0 is published for every initialized organization'
);

select is(
  (
    select count(*)
    from public.changelog_entries
    where version = '1.3.0'
      and status = 'published'
      and published_at::date = date '2026-06-23'
  ),
  (
    select count(*)
    from public.organizations organization
    where exists (
      select 1
      from public.memberships membership
      where membership.organization_id = organization.id
    )
  ),
  'v1.3.0 uses the approved editorial publication date'
);

select * from finish();
rollback;
