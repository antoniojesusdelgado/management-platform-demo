create type public.payroll_run_status as enum (
  'collecting', 'validating', 'calculated', 'reviewed', 'closed'
);

alter table public.payroll_runs alter column status drop default;
alter table public.payroll_runs
  alter column status type public.payroll_run_status
  using (
    case status::text
      when 'backlog' then 'collecting'
      when 'active' then 'validating'
      when 'blocked' then 'validating'
      when 'done' then 'reviewed'
      when 'archived' then 'closed'
      else 'collecting'
    end
  )::public.payroll_run_status;
alter table public.payroll_runs alter column status set default 'collecting';

alter table public.payroll_runs
  add column people_count integer not null default 1,
  add column gross_total_cents bigint not null default 1,
  add column deduction_total_cents bigint not null default 0,
  add column net_total_cents bigint generated always as (gross_total_cents - deduction_total_cents) stored,
  add column currency char(3) not null default 'EUR',
  add constraint payroll_people_count_range check (people_count between 1 and 10000),
  add constraint payroll_gross_total_range check (gross_total_cents between 1 and 10000000000),
  add constraint payroll_deduction_total_range check (deduction_total_cents between 0 and gross_total_cents),
  add constraint payroll_currency_supported check (currency in ('EUR', 'USD', 'GBP'));

create table public.payroll_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.payroll_runs(id) on delete cascade,
  kind text not null check (kind in ('created', 'updated', 'status')),
  from_status public.payroll_run_status,
  to_status public.payroll_run_status not null,
  note text not null check (char_length(note) between 3 and 1000),
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index payroll_org_status_period_idx on public.payroll_runs (organization_id, status, period_start desc);
create index payroll_events_org_run_idx on public.payroll_events (organization_id, run_id, created_at desc);

insert into public.permissions (code, description)
values ('payroll.runs.manage', 'Gestionar ciclos agregados sintéticos de nómina')
on conflict (code) do nothing;

create or replace function public.create_payroll_run(
  expected_organization_id uuid,
  target_period_start date,
  target_period_end date,
  target_people_count integer,
  target_gross_total_cents bigint,
  target_deduction_total_cents bigint,
  target_currency text,
  target_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_id uuid;
  normalized_currency text := upper(btrim(target_currency));
  normalized_notes text := btrim(target_notes);
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_permission(expected_organization_id, 'payroll.runs.manage') then raise exception 'permission denied'; end if;
  if target_period_start is null or target_period_end is null or target_period_end < target_period_start then raise exception 'invalid payroll period'; end if;
  if target_people_count not between 1 and 10000 then raise exception 'invalid payroll people count'; end if;
  if target_gross_total_cents not between 1 and 10000000000 or target_deduction_total_cents not between 0 and target_gross_total_cents then raise exception 'invalid payroll totals'; end if;
  if normalized_currency not in ('EUR', 'USD', 'GBP') then raise exception 'unsupported payroll currency'; end if;
  if char_length(normalized_notes) > 1000 then raise exception 'payroll notes too long'; end if;

  insert into public.payroll_runs (organization_id, period_start, period_end, people_count, gross_total_cents, deduction_total_cents, currency, notes, status, created_by)
  values (expected_organization_id, target_period_start, target_period_end, target_people_count, target_gross_total_cents, target_deduction_total_cents, normalized_currency::char(3), normalized_notes, 'collecting', auth.uid())
  returning id into created_id;

  insert into public.payroll_events (organization_id, run_id, kind, from_status, to_status, note, actor_profile_id)
  values (expected_organization_id, created_id, 'created', null, 'collecting', 'Ciclo agregado sintético creado.', auth.uid());
  return created_id;
end;
$$;

create or replace function public.update_payroll_collecting_run(
  target_run_id uuid,
  expected_organization_id uuid,
  target_period_start date,
  target_period_end date,
  target_people_count integer,
  target_gross_total_cents bigint,
  target_deduction_total_cents bigint,
  target_currency text,
  target_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_run public.payroll_runs%rowtype;
  normalized_currency text := upper(btrim(target_currency));
  normalized_notes text := btrim(target_notes);
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_permission(expected_organization_id, 'payroll.runs.manage') then raise exception 'permission denied'; end if;
  select * into current_run from public.payroll_runs where id = target_run_id and organization_id = expected_organization_id for update;
  if not found then raise exception 'payroll run not found'; end if;
  if current_run.status <> 'collecting' then raise exception 'only collecting runs can be edited'; end if;
  if target_period_start is null or target_period_end is null or target_period_end < target_period_start then raise exception 'invalid payroll period'; end if;
  if target_people_count not between 1 and 10000 then raise exception 'invalid payroll people count'; end if;
  if target_gross_total_cents not between 1 and 10000000000 or target_deduction_total_cents not between 0 and target_gross_total_cents then raise exception 'invalid payroll totals'; end if;
  if normalized_currency not in ('EUR', 'USD', 'GBP') or char_length(normalized_notes) > 1000 then raise exception 'invalid payroll metadata'; end if;

  update public.payroll_runs set period_start = target_period_start, period_end = target_period_end, people_count = target_people_count, gross_total_cents = target_gross_total_cents, deduction_total_cents = target_deduction_total_cents, currency = normalized_currency::char(3), notes = normalized_notes, updated_at = now() where id = target_run_id;
  insert into public.payroll_events (organization_id, run_id, kind, from_status, to_status, note, actor_profile_id)
  values (expected_organization_id, target_run_id, 'updated', 'collecting', 'collecting', 'Recopilación agregada actualizada.', auth.uid());
end;
$$;

create or replace function public.transition_payroll_run(
  target_run_id uuid,
  target_status public.payroll_run_status,
  transition_note text,
  expected_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_run public.payroll_runs%rowtype;
  normalized_note text := btrim(transition_note);
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_permission(expected_organization_id, 'payroll.runs.manage') then raise exception 'permission denied'; end if;
  select * into current_run from public.payroll_runs where id = target_run_id and organization_id = expected_organization_id for update;
  if not found then raise exception 'payroll run not found'; end if;
  if char_length(normalized_note) not between 3 and 1000 then raise exception 'transition note required'; end if;
  if not (
    (current_run.status = 'collecting' and target_status = 'validating') or
    (current_run.status = 'validating' and target_status = 'calculated') or
    (current_run.status = 'calculated' and target_status = 'reviewed') or
    (current_run.status = 'reviewed' and target_status = 'closed')
  ) then raise exception 'invalid payroll transition'; end if;

  update public.payroll_runs set status = target_status, updated_at = now() where id = target_run_id;
  insert into public.payroll_events (organization_id, run_id, kind, from_status, to_status, note, actor_profile_id)
  values (expected_organization_id, target_run_id, 'status', current_run.status, target_status, normalized_note, auth.uid());
end;
$$;

revoke all on function public.create_payroll_run(uuid, date, date, integer, bigint, bigint, text, text) from public, anon;
revoke all on function public.update_payroll_collecting_run(uuid, uuid, date, date, integer, bigint, bigint, text, text) from public, anon;
revoke all on function public.transition_payroll_run(uuid, public.payroll_run_status, text, uuid) from public, anon;
grant execute on function public.create_payroll_run(uuid, date, date, integer, bigint, bigint, text, text) to authenticated;
grant execute on function public.update_payroll_collecting_run(uuid, uuid, date, date, integer, bigint, bigint, text, text) to authenticated;
grant execute on function public.transition_payroll_run(uuid, public.payroll_run_status, text, uuid) to authenticated;

alter table public.payroll_events enable row level security;
drop policy if exists "authorized members can read payroll" on public.payroll_runs;
create policy "authorized members can read payroll" on public.payroll_runs for select to authenticated using (private.has_permission(organization_id, 'payroll.runs.view'));
create policy "authorized members can read payroll events" on public.payroll_events for select to authenticated using (private.has_permission(organization_id, 'payroll.runs.view'));

revoke all on table public.payroll_runs, public.payroll_events from public, anon;
revoke insert, update, delete on table public.payroll_runs, public.payroll_events from authenticated;
grant select on table public.payroll_runs, public.payroll_events to authenticated;
revoke all on type public.payroll_run_status from public, anon;
grant usage on type public.payroll_run_status to authenticated;
