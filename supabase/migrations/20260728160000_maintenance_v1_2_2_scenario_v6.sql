-- scenario-checksum: e2094f567e37fa23b782c2501abc6aa9810e817a255a5da362ef185a8e69cec3
-- target_people_count := 32
-- target_project_count := 10
-- target_task_count := 120
-- target_leave_count := 104
-- target_incident_count := 60
-- target_treasury_count := 360
-- target_payroll_count := 18
-- target_payroll_participant_count := 576
-- target_integration_run_count := 72
-- target_changelog_count := 12

alter table public.people
  add column employment_contract_type text not null
    default 'indefinite_ordinary'
    check (
      employment_contract_type in (
        'indefinite_ordinary',
        'permanent_discontinuous',
        'temporary_production',
        'temporary_substitution'
      )
    );

create index people_organization_contract_idx
  on public.people (organization_id, employment_contract_type);

create or replace function private.synchronize_project_task_state(
  target_project_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  total_tasks integer;
  incomplete_tasks integer;
begin
  if target_project_id is null then
    return;
  end if;

  select
    count(*)::integer,
    count(*) filter (where task.status <> 'completed'::public.task_status)::integer
  into total_tasks, incomplete_tasks
  from public.tasks task
  where task.project_id = target_project_id;

  update public.projects project
  set status = case
        when total_tasks > 0 and incomplete_tasks = 0
          then 'completed'::public.project_status
        when project.status = 'completed'::public.project_status
          and incomplete_tasks > 0
          then 'active'::public.project_status
        else project.status
      end,
      updated_at = now()
  where project.id = target_project_id
    and (
      (total_tasks > 0 and incomplete_tasks = 0
        and project.status <> 'completed'::public.project_status)
      or
      (incomplete_tasks > 0
        and project.status = 'completed'::public.project_status)
    );
end;
$$;

revoke all on function private.synchronize_project_task_state(uuid)
from public, anon, authenticated;

create or replace function private.synchronize_project_after_task_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op <> 'INSERT' then
    perform private.synchronize_project_task_state(old.project_id);
  end if;

  if tg_op <> 'DELETE'
    and (tg_op = 'INSERT' or new.project_id is distinct from old.project_id)
  then
    perform private.synchronize_project_task_state(new.project_id);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform private.synchronize_project_task_state(new.project_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.synchronize_project_after_task_change()
from public, anon, authenticated;

drop trigger if exists synchronize_project_after_task_change on public.tasks;
create trigger synchronize_project_after_task_change
after insert or delete or update of status, project_id on public.tasks
for each row execute function private.synchronize_project_after_task_change();

create or replace function private.validate_project_task_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  total_tasks integer;
  incomplete_tasks integer;
begin
  select
    count(*)::integer,
    count(*) filter (where task.status <> 'completed'::public.task_status)::integer
  into total_tasks, incomplete_tasks
  from public.tasks task
  where task.project_id = new.id;

  if total_tasks > 0
    and new.status = 'completed'::public.project_status
    and incomplete_tasks > 0
  then
    raise exception 'completed projects require all tasks to be completed';
  end if;

  if total_tasks > 0
    and new.status <> 'completed'::public.project_status
    and incomplete_tasks = 0
  then
    raise exception 'projects with all tasks completed require completed status';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_project_task_state()
from public, anon, authenticated;

drop trigger if exists validate_project_task_state on public.projects;
create constraint trigger validate_project_task_state
after insert or update of status on public.projects
deferrable initially deferred
for each row execute function private.validate_project_task_state();

create or replace function private.rebalance_standard_demo_scenario_v6(
  target_organization_id uuid,
  actor_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_organization_id is null or actor_profile_id is null then
    raise exception 'organization and actor are required';
  end if;

  with ranked_people as (
    select
      person.id,
      row_number() over (order by person.display_name, person.id) as row_number
    from public.people person
    where person.organization_id = target_organization_id
  )
  update public.people person
  set employment_contract_type = case
        when ranked_people.row_number <= 23 then 'indefinite_ordinary'
        when ranked_people.row_number <= 26 then 'permanent_discontinuous'
        when ranked_people.row_number <= 30 then 'temporary_production'
        else 'temporary_substitution'
      end,
      updated_at = now()
  from ranked_people
  where person.id = ranked_people.id;

  with task_candidates as (
    select
      task.id,
      project.status as project_status,
      row_number() over (
        partition by task.project_id
        order by task.created_at desc, task.id
      ) as project_rank
    from public.tasks task
    join public.projects project on project.id = task.project_id
    where task.organization_id = target_organization_id
  ),
  ranked_open_tasks as (
    select
      candidate.id,
      row_number() over (
        order by
          case
            when candidate.project_status <> 'completed'::public.project_status
              and candidate.project_rank = 1
              then 0
            else 1
          end,
          md5(candidate.id::text)
      ) as open_rank
    from task_candidates candidate
    where candidate.project_status <> 'completed'::public.project_status
  )
  update public.tasks task
  set status = case
        when task_candidates.project_status = 'completed'::public.project_status
          then 'completed'::public.task_status
        when ranked_open_tasks.open_rank between 1 and 12
          then 'pending'::public.task_status
        when ranked_open_tasks.open_rank between 13 and 20
          then 'in_progress'::public.task_status
        when ranked_open_tasks.open_rank between 21 and 23
          then 'blocked'::public.task_status
        when ranked_open_tasks.open_rank between 24 and 30
          then 'in_review'::public.task_status
        else 'completed'::public.task_status
      end,
      updated_at = now()
  from task_candidates
  left join ranked_open_tasks
    on ranked_open_tasks.id = task_candidates.id
  where task.id = task_candidates.id;

  perform private.synchronize_project_task_state(project.id)
  from public.projects project
  where project.organization_id = target_organization_id;

  update public.organizations
  set scenario_version = 6,
      updated_at = now()
  where id = target_organization_id;

  insert into public.demo_scenario_versions (
    organization_id,
    scenario_version,
    scenario_checksum,
    restored_at,
    restored_by
  )
  values (
    target_organization_id,
    6,
    'e2094f567e37fa23b782c2501abc6aa9810e817a255a5da362ef185a8e69cec3',
    now(),
    actor_profile_id
  )
  on conflict (organization_id) do update
  set scenario_version = excluded.scenario_version,
      scenario_checksum = excluded.scenario_checksum,
      restored_at = excluded.restored_at,
      restored_by = excluded.restored_by;

  insert into public.audit_events (
    organization_id,
    actor_profile_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_organization_id,
    actor_profile_id,
    'demo.scenario.v6_restored',
    'demo_scenario',
    target_organization_id,
    jsonb_build_object(
      'scenario_version', 6,
      'checksum', 'e2094f567e37fa23b782c2501abc6aa9810e817a255a5da362ef185a8e69cec3',
      'synthetic_only', true,
      'maintenance_release', 'v1.2.2'
    )
  );
end;
$$;

revoke all on function private.rebalance_standard_demo_scenario_v6(uuid, uuid)
from public, anon, authenticated;

alter function private.seed_standard_demo_scenario(uuid, uuid)
  rename to seed_standard_demo_scenario_v5;

create or replace function private.seed_standard_demo_scenario(
  target_organization_id uuid,
  actor_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_scenario_version integer;
begin
  select coalesce(organization.scenario_version, 0)
  into current_scenario_version
  from public.organizations organization
  where organization.id = target_organization_id
  for update;

  if current_scenario_version >= 6 then
    return;
  end if;

  if current_scenario_version < 5 then
    perform private.seed_standard_demo_scenario_v5(
      target_organization_id,
      actor_profile_id
    );
  end if;

  perform private.rebalance_standard_demo_scenario_v6(
    target_organization_id,
    actor_profile_id
  );
end;
$$;

revoke all on function private.seed_standard_demo_scenario(uuid, uuid)
from public, anon, authenticated;

create or replace function public.restore_demo_scenario_v6()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select membership.organization_id
  into target_organization_id
  from public.memberships membership
  where membership.profile_id = auth.uid()
    and membership.status = 'active'
  order by membership.created_at
  limit 1;

  if target_organization_id is null
    or not private.has_permission(target_organization_id, 'settings.workspace.manage')
  then
    raise exception 'permission denied';
  end if;

  perform private.rebalance_standard_demo_scenario_v6(
    target_organization_id,
    auth.uid()
  );
end;
$$;

revoke all on function public.restore_demo_scenario_v6() from public, anon;
grant execute on function public.restore_demo_scenario_v6() to authenticated;

create or replace function public.restore_demo_scenario(
  expected_organization_id uuid,
  target_module text default 'all'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.has_permission(
    expected_organization_id,
    'settings.workspace.manage'
  ) then
    raise exception 'permission denied';
  end if;

  if target_module not in (
    'all', 'proyectos', 'tareas', 'vacaciones', 'incidencias',
    'tesoreria', 'nominas', 'personal', 'novedades'
  ) then
    raise exception 'unsupported scenario module';
  end if;

  delete from public.task_dependencies where organization_id = expected_organization_id;
  delete from public.task_comments where organization_id = expected_organization_id;
  delete from public.tasks where organization_id = expected_organization_id;
  delete from public.incidents where organization_id = expected_organization_id;
  delete from public.projects where organization_id = expected_organization_id;
  delete from public.leave_requests where organization_id = expected_organization_id;
  delete from public.treasury_entries where organization_id = expected_organization_id;
  delete from public.payroll_runs where organization_id = expected_organization_id;
  delete from public.integration_runs where organization_id = expected_organization_id;
  delete from public.changelog_entries where organization_id = expected_organization_id;
  delete from public.people
  where organization_id = expected_organization_id and profile_id is null;

  update public.organizations
  set scenario_version = null
  where id = expected_organization_id;

  perform private.seed_standard_demo_scenario(
    expected_organization_id,
    auth.uid()
  );

  insert into public.audit_events (
    organization_id, actor_profile_id, event_type, entity_type, metadata
  )
  values (
    expected_organization_id,
    auth.uid(),
    'demo.scenario_restored',
    'demo_scenario',
    jsonb_build_object(
      'module', target_module,
      'scenario_version', 6,
      'restoration_scope', 'complete'
    )
  );
end;
$$;

revoke all on function public.restore_demo_scenario(uuid, text) from public, anon;
grant execute on function public.restore_demo_scenario(uuid, text) to authenticated;

do $$
declare
  target record;
begin
  for target in
    select
      organization.id as organization_id,
      membership.profile_id as actor_profile_id
    from public.organizations organization
    join lateral (
      select active_membership.profile_id
      from public.memberships active_membership
      where active_membership.organization_id = organization.id
        and active_membership.status = 'active'
      order by active_membership.created_at
      limit 1
    ) membership on true
    where coalesce(organization.scenario_version, 0) = 5
  loop
    perform private.rebalance_standard_demo_scenario_v6(
      target.organization_id,
      target.actor_profile_id
    );
  end loop;
end;
$$;
