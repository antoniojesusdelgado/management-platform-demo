begin;

select plan(2);

select ok(
  position(
    'else ''employee''' in pg_get_functiondef(
      'private.generate_demo_scenario_v7_interval(uuid,uuid,date,date)'::regprocedure
    )
  ) = 0,
  'scenario generation does not use an invalid person role'
);

select ok(
  position(
    'else ''collaborator''' in pg_get_functiondef(
      'private.generate_demo_scenario_v7_interval(uuid,uuid,date,date)'::regprocedure
    )
  ) > 0,
  'scenario generation uses the supported collaborator role'
);

select * from finish();
rollback;
