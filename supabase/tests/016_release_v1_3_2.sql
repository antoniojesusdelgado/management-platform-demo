begin;
select plan(10);

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values (
  'f3200000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'release-v1-3-2-user@example.test',
  '{"provider":"google","providers":["google"]}',
  '{}',
  now(),
  now()
);

select extensions.has_function(
  'private',
  'scenario_v7_person_name',
  array['integer'],
  'Scenario V7 exposes one deterministic private name mapping'
);

select is(
  private.scenario_v7_person_name(1),
  'Lucía Martín',
  'the first authenticated profile matches the guest directory'
);

select is(
  private.scenario_v7_person_name(33),
  'Lucía León',
  'the generated combinations remain deterministic after the base catalog'
);

select is(
  private.scenario_v7_person_name(266),
  'Pablo Romero',
  'the final planned profile receives a natural full name'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"f3200000-0000-4000-8000-000000000001","role":"authenticated"}',
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
  'a newly provisioned organization receives the current directory and release'
);

select is(
  (
    select count(*)
    from public.people
    where display_name like 'Persona sint%'
  ),
  0::bigint,
  'no authenticated profile keeps a numbered placeholder'
);

select is(
  (
    select count(*)
    from (
      select organization_id, display_name
      from public.people
      group by organization_id, display_name
      having count(*) > 1
    ) duplicates
  ),
  0::bigint,
  'full names are unique inside every organization'
);

select is(
  (
    select count(*)
    from public.changelog_entries
    where version = '1.3.2'
      and status = 'published'
      and published_at::date = date '2026-07-30'
  ),
  (
    select count(*)
    from public.organizations
    where scenario_version = 7
  ),
  'v1.3.2 is published once for every Scenario V7 organization'
);

select is(
  (
    select title
    from public.changelog_entries
    where version = '1.3.1'
    order by created_at
    limit 1
  ),
  'Más cómoda en móvil y más segura',
  'the previous patch uses natural user-facing wording'
);

select is(
  (
    select count(*)
    from public.changelog_entries
    where status = 'published'
      and (
        title ~* '(scenario|responsive|backfill)'
        or summary ~* '(scenario|responsive|backfill)'
      )
  ),
  0::bigint,
  'published news does not expose internal implementation jargon'
);

select * from finish();
rollback;
