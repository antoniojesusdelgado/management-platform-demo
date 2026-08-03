begin;

select plan(2);

select unlike(
  pg_get_functiondef(
    'private.generate_demo_scenario_v7_interval(uuid,uuid,date,date)'::regprocedure
  ),
  '%else ''employee''%',
  'scenario generation does not use an invalid person role'
);

select like(
  pg_get_functiondef(
    'private.generate_demo_scenario_v7_interval(uuid,uuid,date,date)'::regprocedure
  ),
  '%else ''collaborator''%',
  'scenario generation uses the supported collaborator role'
);

select * from finish();
rollback;
