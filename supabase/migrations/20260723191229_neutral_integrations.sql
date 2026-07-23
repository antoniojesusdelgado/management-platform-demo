create type public.integration_kind as enum (
  'financial',
  'payroll',
  'people'
);
create type public.integration_run_status as enum (
  'scheduled',
  'running',
  'succeeded',
  'partial',
  'failed',
  'cancelled'
);

create table public.integration_connectors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null check (code ~ '^[a-z][a-z0-9_]{2,39}$'),
  name text not null check (char_length(name) between 3 and 80),
  kind public.integration_kind not null,
  enabled boolean not null default true,
  schedule_cron text not null default '15 2 * * *',
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.integration_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connector_id uuid not null references public.integration_connectors(id) on delete cascade,
  effective_date date not null,
  status public.integration_run_status not null default 'scheduled',
  trigger_kind text not null check (trigger_kind in ('manual', 'schedule', 'retry')),
  source_sequence integer not null default 1 check (source_sequence > 0),
  processed_count integer not null default 0 check (processed_count >= 0),
  imported_count integer not null default 0 check (imported_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  safe_summary text not null default '',
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (connector_id, effective_date, source_sequence)
);

create table public.integration_run_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.integration_runs(id) on delete cascade,
  source_sequence integer not null check (source_sequence > 0),
  outcome text not null check (outcome in ('imported', 'duplicate', 'rejected')),
  target_kind text not null check (
    target_kind in ('treasury_entry', 'payroll_cycle', 'person', 'validation')
  ),
  safe_message text not null default '',
  created_at timestamptz not null default now(),
  unique (run_id, source_sequence)
);

create table public.integration_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connector_id uuid not null references public.integration_connectors(id) on delete cascade,
  source_pattern text not null check (char_length(source_pattern) between 2 and 120),
  target_code text not null check (target_code ~ '^[a-z][a-z0-9_]{1,39}$'),
  priority integer not null default 100 check (priority between 1 and 999),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (connector_id, source_pattern)
);

create table public.data_quality_issues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.integration_runs(id) on delete cascade,
  severity text not null check (severity in ('info', 'warning', 'error')),
  code text not null check (code ~ '^[a-z][a-z0-9_]{2,59}$'),
  safe_message text not null check (char_length(safe_message) between 3 and 240),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index integration_runs_org_created_idx
  on public.integration_runs (organization_id, created_at desc);
create index integration_runs_connector_status_idx
  on public.integration_runs (connector_id, status, effective_date desc);
create index integration_run_items_run_idx
  on public.integration_run_items (run_id, outcome);
create index data_quality_issues_org_open_idx
  on public.data_quality_issues (organization_id, severity)
  where resolved_at is null;

alter table public.integration_connectors enable row level security;
alter table public.integration_runs enable row level security;
alter table public.integration_run_items enable row level security;
alter table public.integration_mappings enable row level security;
alter table public.data_quality_issues enable row level security;

create policy integration_connectors_view on public.integration_connectors
for select to authenticated using (
  private.has_permission(organization_id, 'integrations.runs.view')
);
create policy integration_connectors_manage on public.integration_connectors
for all to authenticated using (
  private.has_permission(organization_id, 'integrations.runs.manage')
) with check (
  private.has_permission(organization_id, 'integrations.runs.manage')
);
create policy integration_runs_view on public.integration_runs
for select to authenticated using (
  private.has_permission(organization_id, 'integrations.runs.view')
);
create policy integration_run_items_view on public.integration_run_items
for select to authenticated using (
  private.has_permission(organization_id, 'integrations.runs.view')
);
create policy integration_mappings_view on public.integration_mappings
for select to authenticated using (
  private.has_permission(organization_id, 'integrations.runs.view')
);
create policy integration_mappings_manage on public.integration_mappings
for all to authenticated using (
  private.has_permission(organization_id, 'integrations.runs.manage')
) with check (
  private.has_permission(organization_id, 'integrations.runs.manage')
);
create policy data_quality_issues_view on public.data_quality_issues
for select to authenticated using (
  private.has_permission(organization_id, 'integrations.runs.view')
);

grant select on public.integration_connectors to authenticated;
grant select on public.integration_runs to authenticated;
grant select on public.integration_run_items to authenticated;
grant select on public.integration_mappings to authenticated;
grant select on public.data_quality_issues to authenticated;

create or replace function private.provision_neutral_connectors(
  target_organization_id uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.integration_connectors (
    organization_id,
    code,
    name,
    kind
  )
  values
    (target_organization_id, 'financial_source_a', 'Financial Source A', 'financial'),
    (target_organization_id, 'financial_source_b', 'Financial Source B', 'financial'),
    (target_organization_id, 'payroll_master', 'Payroll Master', 'payroll'),
    (target_organization_id, 'people_master', 'People Master', 'people')
  on conflict (organization_id, code) do nothing;
$$;

revoke all on function private.provision_neutral_connectors(uuid)
from public, anon, authenticated;

create or replace function private.handle_organization_connectors()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.provision_neutral_connectors(new.id);
  return new;
end;
$$;

revoke all on function private.handle_organization_connectors()
from public, anon, authenticated;

create trigger on_organization_create_connectors
after insert on public.organizations
for each row execute function private.handle_organization_connectors();

select private.provision_neutral_connectors(id)
from public.organizations;

create or replace function public.simulate_integration_run(
  expected_organization_id uuid,
  expected_connector_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_id uuid := gen_random_uuid();
  connector_kind public.integration_kind;
  sequence_number integer;
  processed integer;
  duplicates integer;
  errors integer;
begin
  if auth.uid() is null
    or not private.has_permission(
      expected_organization_id,
      'integrations.runs.manage'
    )
  then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  select connector.kind into connector_kind
  from public.integration_connectors connector
  where connector.id = expected_connector_id
    and connector.organization_id = expected_organization_id
    and connector.enabled;
  if connector_kind is null then
    raise exception 'connector unavailable';
  end if;

  select coalesce(max(run.source_sequence), 0) + 1
  into sequence_number
  from public.integration_runs run
  where run.connector_id = expected_connector_id
    and run.effective_date = current_date;

  processed := case connector_kind
    when 'financial' then 36
    when 'payroll' then 18
    else 24
  end;
  duplicates := case connector_kind when 'financial' then 2 else 0 end;
  errors := case connector_kind when 'payroll' then 1 else 0 end;

  insert into public.integration_runs (
    id,
    organization_id,
    connector_id,
    effective_date,
    status,
    trigger_kind,
    source_sequence,
    processed_count,
    imported_count,
    duplicate_count,
    error_count,
    safe_summary,
    started_at,
    finished_at,
    created_by
  )
  values (
    run_id,
    expected_organization_id,
    expected_connector_id,
    current_date,
    case
      when errors > 0 then 'partial'::public.integration_run_status
      else 'succeeded'::public.integration_run_status
    end,
    'manual',
    sequence_number,
    processed,
    processed - duplicates - errors,
    duplicates,
    errors,
    case connector_kind
      when 'financial' then 'Synthetic movements mapped and reconciled.'
      when 'payroll' then 'Aggregate synthetic payroll cycle validated.'
      else 'Synthetic people master changes synchronized.'
    end,
    clock_timestamp(),
    clock_timestamp(),
    auth.uid()
  );

  insert into public.integration_run_items (
    organization_id,
    run_id,
    source_sequence,
    outcome,
    target_kind,
    safe_message
  )
  select
    expected_organization_id,
    run_id,
    item,
    case
      when item <= errors then 'rejected'
      when item <= errors + duplicates then 'duplicate'
      else 'imported'
    end,
    case connector_kind
      when 'financial' then 'treasury_entry'
      when 'payroll' then 'payroll_cycle'
      else 'person'
    end,
    case
      when item <= errors then 'Synthetic consistency exception.'
      when item <= errors + duplicates then 'Idempotency key already processed.'
      else 'Synthetic record processed.'
    end
  from generate_series(1, processed) item;

  if errors > 0 then
    insert into public.data_quality_issues (
      organization_id,
      run_id,
      severity,
      code,
      safe_message
    )
    values (
      expected_organization_id,
      run_id,
      'warning',
      'aggregate_variation',
      'Aggregate variation exceeds the synthetic review threshold.'
    );
  end if;

  update public.integration_connectors
  set last_run_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where id = expected_connector_id;

  return run_id;
end;
$$;

revoke all on function public.simulate_integration_run(uuid, uuid)
from public, anon;
grant execute on function public.simulate_integration_run(uuid, uuid)
to authenticated;
