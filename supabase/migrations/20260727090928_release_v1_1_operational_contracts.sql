-- Applied remotely as 20260727090928.
alter table public.incidents
  add column affected_service text not null default 'Operación',
  add column impact_scope text not null default 'team',
  add column detection_channel text not null default 'support',
  add column root_cause text,
  add column first_response_at timestamptz,
  add column corrective_task_id uuid references public.tasks(id) on delete set null;

alter table public.incidents
  add constraint incidents_impact_scope_check
    check (impact_scope in ('individual', 'team', 'workspace')),
  add constraint incidents_detection_channel_check
    check (detection_channel in ('monitoring', 'support', 'team', 'automation'));

alter table public.treasury_entries
  add column category text not null default 'Operación',
  add column source text not null default 'Manual';

alter table public.treasury_entries
  add constraint treasury_entries_source_check
    check (source in ('Financial Source A', 'Financial Source B', 'Manual'));

alter table public.payroll_runs
  add column employer_cost_total_cents bigint generated always as (
    (gross_total_cents * 1315) / 1000
  ) stored;

create table public.payroll_breakdowns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.payroll_runs(id) on delete cascade,
  team text not null check (char_length(team) between 2 and 100),
  people_count integer not null check (people_count > 0),
  gross_total_cents bigint not null check (gross_total_cents > 0),
  employer_cost_total_cents bigint not null check (
    employer_cost_total_cents >= gross_total_cents
  ),
  unique (run_id, team)
);

create table public.payroll_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.payroll_runs(id) on delete cascade,
  code text not null check (
    code in ('headcount_variation', 'gross_variation', 'totals_consistency')
  ),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  status text not null check (status in ('passed', 'review')),
  summary text not null check (char_length(summary) between 3 and 300),
  unique (run_id, code)
);

alter table public.payroll_breakdowns enable row level security;
alter table public.payroll_checks enable row level security;

create policy payroll_breakdowns_view
on public.payroll_breakdowns
for select
to authenticated
using (private.has_permission(organization_id, 'payroll.runs.view'));

create policy payroll_breakdowns_insert
on public.payroll_breakdowns
for insert
to authenticated
with check (private.has_permission(organization_id, 'payroll.runs.manage'));

create policy payroll_breakdowns_update
on public.payroll_breakdowns
for update
to authenticated
using (private.has_permission(organization_id, 'payroll.runs.manage'))
with check (private.has_permission(organization_id, 'payroll.runs.manage'));

create policy payroll_breakdowns_delete
on public.payroll_breakdowns
for delete
to authenticated
using (private.has_permission(organization_id, 'payroll.runs.manage'));

create policy payroll_checks_view
on public.payroll_checks
for select
to authenticated
using (private.has_permission(organization_id, 'payroll.runs.view'));

create policy payroll_checks_insert
on public.payroll_checks
for insert
to authenticated
with check (private.has_permission(organization_id, 'payroll.runs.manage'));

create policy payroll_checks_update
on public.payroll_checks
for update
to authenticated
using (private.has_permission(organization_id, 'payroll.runs.manage'))
with check (private.has_permission(organization_id, 'payroll.runs.manage'));

create policy payroll_checks_delete
on public.payroll_checks
for delete
to authenticated
using (private.has_permission(organization_id, 'payroll.runs.manage'));

grant select, insert, update, delete
on public.payroll_breakdowns, public.payroll_checks
to authenticated;

alter table public.workspace_configuration
  add column appearance_policy jsonb not null default
    '{"accent":"indigo","density":"comfortable","radius":"medium"}'::jsonb,
  add column calendar_policy jsonb not null default
    '{"country":"ES","week_starts_on":1,"synthetic_holidays":true}'::jsonb,
  add column payroll_policy jsonb not null default
    '{"variation_warning_percent":8,"headcount_warning":2}'::jsonb,
  add column module_policy jsonb not null default
    '{"enabled":[],"order":[]}'::jsonb,
  add column configuration jsonb not null default
    '{
      "appearance":{"accent":"indigo","density":"comfortable","radius":"medium"},
      "calendar":{"country":"ES","weekStartsOn":1,"syntheticHolidays":true},
      "vacations":{"annualAllowanceDays":23,"minimumNoticeDays":7,"overlapWarningCount":2},
      "tasks":{"pendingWip":40,"inProgressWip":12,"reviewWip":8},
      "incidents":{"criticalSlaHours":4,"highSlaHours":12,"mediumSlaHours":48},
      "treasury":{"currency":"EUR","autoReconcileConfidence":90,"marginWarningPercent":8},
      "payroll":{"variationWarningPercent":8,"headcountWarning":2},
      "integrations":{"scheduleUtc":"02:15","retryLimit":2,"notifyOnPartial":true},
      "analytics":{"projectRiskThreshold":70,"slaTargetPercent":92,"cashMarginTargetPercent":12}
    }'::jsonb;

create or replace function public.update_workspace_configuration(
  expected_organization_id uuid,
  configuration_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
begin
  if current_profile_id is null then
    raise exception 'Authentication required';
  end if;

  if not private.has_permission(
    expected_organization_id,
    'settings.workspace.manage'
  ) then
    raise exception 'Permission denied';
  end if;

  if jsonb_typeof(configuration_payload) <> 'object'
     or not configuration_payload ?& array[
       'appearance','calendar','vacations','tasks','incidents','treasury',
       'payroll','integrations','analytics'
     ] then
    raise exception 'Invalid workspace configuration';
  end if;

  update public.workspace_configuration
  set configuration = configuration_payload,
      updated_at = timezone('utc', now())
  where organization_id = expected_organization_id;

  insert into public.audit_events (
    organization_id,
    actor_profile_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    expected_organization_id,
    current_profile_id,
    'settings.configuration.updated',
    'workspace_configuration',
    expected_organization_id,
    jsonb_build_object(
      'sections',
      array[
        'appearance','calendar','vacations','tasks','incidents','treasury',
        'payroll','integrations','analytics'
      ]
    )
  );
end;
$$;

revoke all on function public.update_workspace_configuration(uuid, jsonb)
from public, anon;
grant execute on function public.update_workspace_configuration(uuid, jsonb)
to authenticated;

create index incidents_service_status_idx
  on public.incidents (organization_id, affected_service, status);
create index incidents_corrective_task_id_idx
  on public.incidents (corrective_task_id);
create index treasury_entries_category_date_idx
  on public.treasury_entries (organization_id, category, entry_date desc);
create index payroll_breakdowns_run_idx
  on public.payroll_breakdowns (organization_id, run_id);
create index payroll_breakdowns_run_fk_idx
  on public.payroll_breakdowns (run_id);
create index payroll_checks_organization_idx
  on public.payroll_checks (organization_id);
create index payroll_checks_run_idx
  on public.payroll_checks (run_id);
