-- Keep the persisted scenario contract on V7 even when an organization was
-- already generated through yesterday and the incremental RPC has no interval
-- left to append.

update public.organizations
set
  scenario_version = 7,
  updated_at = now()
where scenario_version < 7
  and scenario_generated_through_date is not null;

create or replace function private.seed_standard_demo_scenario(
  target_organization_id uuid,
  actor_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_standard_demo_scenario_v6(
    target_organization_id,
    actor_profile_id
  );
  perform private.ensure_v1_3_release(
    target_organization_id,
    actor_profile_id
  );

  update public.organizations
  set scenario_version = 7,
      updated_at = now()
  where id = target_organization_id
    and scenario_version < 7;
end;
$$;

revoke all on function private.seed_standard_demo_scenario(uuid, uuid)
from public, anon, authenticated;
