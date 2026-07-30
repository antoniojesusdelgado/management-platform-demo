begin;
select plan(23);

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values (
  'f3100000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'release-v1-3-1-user@example.test',
  '{"provider":"google","providers":["google"]}',
  '{}',
  now(),
  now()
);

select has_column(
  'public',
  'organizations',
  'scenario_v7_backfilled_at',
  'organizations distinguish the generated date from the V7 backfill'
);

select is(
  private.scenario_v7_workforce_start_date(100),
  date '2025-01-01',
  'the first workforce milestone ends at 100 people'
);
select is(
  private.scenario_v7_workforce_start_date(145),
  date '2025-06-29',
  'the second workforce cohort is complete by 30 June 2025'
);
select is(
  private.scenario_v7_workforce_start_date(183),
  date '2025-12-30',
  'the third workforce cohort is complete by 31 December 2025'
);
select is(
  private.scenario_v7_workforce_start_date(218),
  date '2026-03-30',
  'the fourth workforce cohort is complete by 31 March 2026'
);
select is(
  private.scenario_v7_workforce_start_date(256),
  date '2026-06-29',
  'the canonical June workforce is complete by 30 June 2026'
);
select is(
  private.scenario_v7_workforce_end_date(98),
  date '2025-08-04',
  'the first historical reduction matches the TypeScript schedule'
);
select is(
  private.scenario_v7_workforce_end_date(177),
  date '2026-04-13',
  'the second historical reduction matches the TypeScript schedule'
);

update public.people
set display_name = 'Perfil manual preservado'
where id = (
  select person.id
  from public.people person
  join public.memberships membership
    on membership.organization_id = person.organization_id
  where membership.profile_id = 'f3100000-0000-4000-8000-000000000001'
  order by person.created_at, person.id
  limit 1
);

select set_config(
  'request.jwt.claims',
  '{"sub":"f3100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  format(
    'select public.ensure_demo_scenario_current(%L)',
    (
      select organization_id
      from public.memberships
      where profile_id = auth.uid()
    )
  ),
  'a legacy organization can be backfilled additively'
);

select is(
  (
    select display_name
    from public.people
    where organization_id = (
      select organization_id
      from public.memberships
      where profile_id = auth.uid()
    )
      and display_name = 'Perfil manual preservado'
  ),
  'Perfil manual preservado',
  'the backfill preserves an existing edited profile'
);

select ok(
  (
    select count(*) between 245 and 255
    from public.people
    where organization_id = (
      select organization_id
      from public.memberships
      where profile_id = auth.uid()
    )
      and status = 'active'
  ),
  'the current active workforce remains inside the 245 to 255 band'
);

select ok(
  (
    select scenario_v7_backfilled_at is not null
    from public.organizations
    where id = (
      select organization_id
      from public.memberships
      where profile_id = auth.uid()
    )
  ),
  'the historical backfill is marked complete'
);

select is(
  (
    select count(*)
    from public.scenario_evolution_events
    where organization_id = (
      select organization_id
      from public.memberships
      where profile_id = auth.uid()
    )
      and event_type = 'backfilled'
  ),
  1::bigint,
  'the backfill records one deterministic evolution event'
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
  'a second backfill request is idempotent'
);

select is(
  (
    select count(*)
    from public.scenario_evolution_events
    where organization_id = (
      select organization_id
      from public.memberships
      where profile_id = auth.uid()
    )
      and event_type = 'backfilled'
  ),
  1::bigint,
  'the idempotent request does not duplicate the backfill event'
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
      and version = '1.3.1'
      and published_at::date = date '2026-07-29'
  ),
  1::bigint,
  'the patch release is published once with the approved date'
);

reset role;

select is(
  has_function_privilege(
    'authenticated',
    'public.restore_demo_scenario_v6()',
    'EXECUTE'
  ),
  false,
  'authenticated users cannot execute the obsolete V6 restore RPC'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.check_management_request_rate_limit()',
    'EXECUTE'
  ),
  true,
  'authenticated Data API requests can execute the pre-request function'
);

select is(
  has_function_privilege(
    'anon',
    'public.check_management_request_rate_limit()',
    'EXECUTE'
  ),
  true,
  'anonymous Data API requests can execute the pre-request function'
);

select is(
  has_function_privilege(
    'authenticator',
    'public.check_management_request_rate_limit()',
    'EXECUTE'
  ),
  true,
  'PostgREST can invoke the guarded rate-limit pre-request function'
);

select set_config('request.method', 'POST', true);
select set_config(
  'request.path',
  '/rpc/check_management_request_rate_limit',
  true
);
select set_config('request.headers', '{"x-forwarded-for":"192.0.2.30"}', true);

select throws_ok(
  'select public.check_management_request_rate_limit()',
  'PGRST',
  null,
  'the pre-request guard cannot be invoked as a direct public RPC'
);

select set_config('request.method', 'POST', true);
select set_config('request.path', '/rpc/ensure_demo_scenario_current', true);
select set_config('request.headers', '{"x-forwarded-for":"192.0.2.31"}', true);

select public.check_management_request_rate_limit()
from generate_series(1, 9);

select lives_ok(
  'select public.check_management_request_rate_limit()',
  'the tenth expensive request remains inside the configured burst'
);

select throws_ok(
  'select public.check_management_request_rate_limit()',
  'PGRST',
  null,
  'the eleventh expensive request is rejected as HTTP 429'
);

select * from finish();
rollback;
