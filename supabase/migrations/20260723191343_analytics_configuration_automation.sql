create table public.saved_analytics_views (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  module_id text not null check (module_id ~ '^[a-z][a-z0-9-]{2,39}$'),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id, module_id, name)
);

create table public.workspace_configuration (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  vacation_policy jsonb not null default '{"notice_days":7,"annual_days":22}'::jsonb,
  task_policy jsonb not null default '{"default_wip":5}'::jsonb,
  incident_policy jsonb not null default '{"low_hours":72,"medium_hours":48,"high_hours":24,"critical_hours":4}'::jsonb,
  treasury_policy jsonb not null default '{"currency":"EUR","auto_reconcile":true}'::jsonb,
  analytics_policy jsonb not null default '{"risk_threshold":2,"overdue_threshold":5}'::jsonb,
  integration_policy jsonb not null default '{"schedule":"15 2 * * *","timezone":"UTC"}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index saved_analytics_views_profile_idx
  on public.saved_analytics_views (organization_id, profile_id, module_id);

alter table public.saved_analytics_views enable row level security;
alter table public.workspace_configuration enable row level security;

create policy saved_analytics_views_owner on public.saved_analytics_views
for all to authenticated
using (
  profile_id = auth.uid()
  and private.has_permission(organization_id, 'analytics.dashboards.view')
)
with check (
  profile_id = auth.uid()
  and private.has_permission(organization_id, 'analytics.dashboards.view')
);

create policy workspace_configuration_view on public.workspace_configuration
for select to authenticated using (
  private.is_org_member(organization_id)
);

create policy workspace_configuration_manage on public.workspace_configuration
for all to authenticated using (
  private.has_permission(organization_id, 'settings.workspace.manage')
) with check (
  private.has_permission(organization_id, 'settings.workspace.manage')
);

grant select, insert, update, delete on public.saved_analytics_views to authenticated;
grant select, insert, update on public.workspace_configuration to authenticated;

insert into public.workspace_configuration (organization_id)
select id from public.organizations
on conflict (organization_id) do nothing;

create or replace function private.handle_organization_configuration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspace_configuration (organization_id)
  values (new.id)
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_organization_configuration()
from public, anon, authenticated;

create trigger on_organization_create_configuration
after insert on public.organizations
for each row execute function private.handle_organization_configuration();

create or replace function private.execute_synthetic_integration(
  target_organization_id uuid,
  target_connector_id uuid,
  target_trigger_kind text,
  target_actor_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_run_id uuid := gen_random_uuid();
  connector_kind public.integration_kind;
  sequence_number integer;
  processed integer;
  duplicates integer;
  errors integer;
begin
  if target_trigger_kind not in ('manual', 'schedule', 'retry') then
    raise exception 'invalid trigger kind';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(target_connector_id::text || current_date::text, 0)
  );

  select connector.kind into connector_kind
  from public.integration_connectors connector
  where connector.id = target_connector_id
    and connector.organization_id = target_organization_id
    and connector.enabled;
  if connector_kind is null then
    raise exception 'connector unavailable';
  end if;

  select coalesce(max(run.source_sequence), 0) + 1
  into sequence_number
  from public.integration_runs run
  where run.connector_id = target_connector_id
    and run.effective_date = current_date;

  processed := case connector_kind
    when 'financial' then 36
    when 'payroll' then 18
    else 24
  end;
  duplicates := case connector_kind when 'financial' then 2 else 0 end;
  errors := case connector_kind when 'payroll' then 1 else 0 end;

  insert into public.integration_runs (
    id, organization_id, connector_id, effective_date, status, trigger_kind,
    source_sequence, processed_count, imported_count, duplicate_count,
    error_count, safe_summary, started_at, finished_at, created_by
  )
  values (
    new_run_id, target_organization_id, target_connector_id, current_date,
    case when errors > 0 then 'partial'::public.integration_run_status
      else 'succeeded'::public.integration_run_status end,
    target_trigger_kind, sequence_number, processed,
    processed - duplicates - errors, duplicates, errors,
    case connector_kind
      when 'financial' then 'Synthetic movements mapped and reconciled.'
      when 'payroll' then 'Aggregate synthetic payroll cycle validated.'
      else 'Synthetic people master changes synchronized.'
    end,
    clock_timestamp(), clock_timestamp(), target_actor_id
  );

  insert into public.integration_run_items (
    organization_id, run_id, source_sequence, outcome, target_kind, safe_message
  )
  select
    target_organization_id, new_run_id, item,
    case when item <= errors then 'rejected'
      when item <= errors + duplicates then 'duplicate'
      else 'imported' end,
    case connector_kind
      when 'financial' then 'treasury_entry'
      when 'payroll' then 'payroll_cycle'
      else 'person' end,
    case when item <= errors then 'Synthetic consistency exception.'
      when item <= errors + duplicates then 'Idempotency key already processed.'
      else 'Synthetic record processed.' end
  from generate_series(1, processed) item;

  if errors > 0 then
    insert into public.data_quality_issues (
      organization_id, run_id, severity, code, safe_message
    )
    values (
      target_organization_id, new_run_id, 'warning', 'aggregate_variation',
      'Aggregate variation exceeds the synthetic review threshold.'
    );
  end if;

  update public.integration_connectors
  set last_run_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where id = target_connector_id;

  return new_run_id;
end;
$$;

revoke all on function private.execute_synthetic_integration(uuid, uuid, text, uuid)
from public, anon, authenticated;

create or replace function public.simulate_integration_run(
  expected_organization_id uuid,
  expected_connector_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or not private.has_permission(
      expected_organization_id,
      'integrations.runs.manage'
    )
  then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  return private.execute_synthetic_integration(
    expected_organization_id,
    expected_connector_id,
    'manual',
    auth.uid()
  );
end;
$$;

revoke all on function public.simulate_integration_run(uuid, uuid)
from public, anon;
grant execute on function public.simulate_integration_run(uuid, uuid)
to authenticated;

create or replace function private.run_scheduled_integrations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  connector record;
  run_count integer := 0;
begin
  for connector in
    select id, organization_id
    from public.integration_connectors
    where enabled
  loop
    perform private.execute_synthetic_integration(
      connector.organization_id,
      connector.id,
      'schedule',
      null
    );
    run_count := run_count + 1;
  end loop;
  return run_count;
end;
$$;

revoke all on function private.run_scheduled_integrations()
from public, anon, authenticated;

create extension if not exists pg_cron;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'nightly-neutral-integrations';
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'nightly-neutral-integrations',
    '15 2 * * *',
    'select private.run_scheduled_integrations();'
  );
end;
$$;

alter function public.get_demo_workspace_status(uuid) volatile;
