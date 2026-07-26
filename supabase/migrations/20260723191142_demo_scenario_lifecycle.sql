create or replace function public.touch_demo_workspace(
  expected_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_org_member(expected_organization_id) then
    raise exception 'permission denied';
  end if;
  update public.organizations
  set last_active_at = now()
  where id = expected_organization_id
    and scenario_version is not null;
end;
$$;

revoke all on function public.touch_demo_workspace(uuid) from public, anon;
grant execute on function public.touch_demo_workspace(uuid) to authenticated;

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
    'all',
    'proyectos',
    'tareas',
    'vacaciones',
    'incidencias',
    'tesoreria',
    'nominas',
    'personal',
    'novedades'
  ) then
    raise exception 'unsupported scenario module';
  end if;

  if target_module in ('all', 'proyectos') then
    delete from public.task_dependencies
    where organization_id = expected_organization_id;
    delete from public.task_comments
    where organization_id = expected_organization_id;
    delete from public.tasks
    where organization_id = expected_organization_id;
    delete from public.incidents
    where organization_id = expected_organization_id;
    delete from public.projects
    where organization_id = expected_organization_id;
  elsif target_module = 'tareas' then
    delete from public.task_dependencies
    where organization_id = expected_organization_id;
    delete from public.task_comments
    where organization_id = expected_organization_id;
    delete from public.tasks
    where organization_id = expected_organization_id;
  elsif target_module = 'incidencias' then
    delete from public.incidents
    where organization_id = expected_organization_id;
  end if;

  if target_module in ('all', 'vacaciones') then
    delete from public.leave_requests
    where organization_id = expected_organization_id;
  end if;
  if target_module in ('all', 'tesoreria') then
    delete from public.treasury_entries
    where organization_id = expected_organization_id;
  end if;
  if target_module in ('all', 'nominas') then
    delete from public.payroll_runs
    where organization_id = expected_organization_id;
  end if;
  if target_module in ('all', 'novedades') then
    delete from public.changelog_entries
    where organization_id = expected_organization_id;
  end if;

  if target_module in ('all', 'personal') then
    if target_module = 'personal' then
      delete from public.task_dependencies
      where organization_id = expected_organization_id;
      delete from public.task_comments
      where organization_id = expected_organization_id;
      delete from public.tasks
      where organization_id = expected_organization_id;
      delete from public.incidents
      where organization_id = expected_organization_id;
      delete from public.leave_requests
      where organization_id = expected_organization_id;
      delete from public.projects
      where organization_id = expected_organization_id;
    end if;
    delete from public.people
    where organization_id = expected_organization_id
      and profile_id is null;
  end if;

  update public.organizations
  set scenario_version = null
  where id = expected_organization_id;

  perform private.seed_standard_demo_scenario(
    expected_organization_id,
    auth.uid()
  );

  insert into public.audit_events (
    organization_id,
    actor_profile_id,
    event_type,
    entity_type,
    metadata
  ) values (
    expected_organization_id,
    auth.uid(),
    'demo.scenario_restored',
    'demo_scenario',
    jsonb_build_object('module', target_module, 'scenario_version', 1)
  );
end;
$$;

revoke all on function public.restore_demo_scenario(uuid, text)
from public, anon;
grant execute on function public.restore_demo_scenario(uuid, text)
to authenticated;

create or replace function public.get_demo_workspace_status(
  expected_organization_id uuid
)
returns table (
  scenario_version integer,
  last_active_at timestamptz,
  database_size_bytes bigint,
  free_plan_read_only_threshold_bytes bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_org_member(expected_organization_id) then
    raise exception 'permission denied';
  end if;
  return query
  select
    organization.scenario_version,
    organization.last_active_at,
    pg_database_size(current_database()),
    500::bigint * 1024 * 1024
  from public.organizations organization
  where organization.id = expected_organization_id;
end;
$$;

revoke all on function public.get_demo_workspace_status(uuid)
from public, anon;
grant execute on function public.get_demo_workspace_status(uuid)
to authenticated;

create or replace function private.cleanup_inactive_demo_workspaces(
  inactive_before timestamptz
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_count integer;
begin
  if inactive_before > now() - interval '90 days' then
    raise exception 'cleanup threshold must be at least 90 days';
  end if;

  with removed as (
    delete from public.organizations organization
    where organization.scenario_version is not null
      and organization.last_active_at < inactive_before
    returning 1
  )
  select count(*) into removed_count from removed;

  return removed_count;
end;
$$;

revoke all on function private.cleanup_inactive_demo_workspaces(timestamptz)
from public, anon, authenticated;
