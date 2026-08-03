do $$
declare
  current_definition text;
  corrected_definition text;
begin
  select pg_get_functiondef(
    'private.generate_demo_scenario_v7_interval(uuid,uuid,date,date)'::regprocedure
  )
  into current_definition;

  corrected_definition := replace(
    current_definition,
    'else ''employee''',
    'else ''collaborator'''
  );

  if corrected_definition = current_definition then
    if position('else ''collaborator''' in current_definition) > 0 then
      return;
    end if;
    raise exception 'scenario v7 role mapping was not found';
  end if;

  execute corrected_definition;
end;
$$;

revoke all on function private.generate_demo_scenario_v7_interval(uuid, uuid, date, date)
from public, anon, authenticated;
