create type public.treasury_entry_status as enum (
  'draft',
  'registered',
  'reconciled',
  'validated',
  'closed'
);

alter table public.treasury_entries alter column status drop default;
alter table public.treasury_entries
  alter column status type public.treasury_entry_status
  using (
    case status::text
      when 'backlog' then 'draft'
      when 'active' then 'registered'
      when 'blocked' then 'reconciled'
      when 'done' then 'closed'
      when 'archived' then 'closed'
      else 'draft'
    end
  )::public.treasury_entry_status;
alter table public.treasury_entries alter column status set default 'draft';

alter table public.treasury_entries
  add constraint treasury_entries_amount_nonzero check (amount_cents <> 0),
  add constraint treasury_entries_amount_range check (amount_cents between -100000000 and 100000000),
  add constraint treasury_entries_currency_supported check (currency in ('EUR', 'USD', 'GBP'));

create table public.treasury_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entry_id uuid not null references public.treasury_entries(id) on delete cascade,
  kind text not null check (kind in ('created', 'updated', 'status')),
  from_status public.treasury_entry_status,
  to_status public.treasury_entry_status not null,
  note text not null check (char_length(note) between 3 and 1000),
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index treasury_org_status_date_idx
  on public.treasury_entries (organization_id, status, entry_date desc);
create index treasury_events_org_entry_idx
  on public.treasury_events (organization_id, entry_id, created_at desc);

insert into public.permissions (code, description)
values ('treasury.entries.manage', 'Gestionar movimientos sintéticos de tesorería')
on conflict (code) do nothing;

create or replace function public.create_treasury_entry(
  expected_organization_id uuid,
  target_entry_date date,
  target_concept text,
  target_amount_cents bigint,
  target_currency text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_id uuid;
  normalized_concept text := btrim(target_concept);
  normalized_currency text := upper(btrim(target_currency));
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_permission(expected_organization_id, 'treasury.entries.manage') then
    raise exception 'permission denied';
  end if;
  if target_entry_date is null or char_length(normalized_concept) not between 3 and 160 then
    raise exception 'invalid treasury input';
  end if;
  if target_amount_cents = 0 or target_amount_cents not between -100000000 and 100000000 then
    raise exception 'invalid treasury amount';
  end if;
  if normalized_currency not in ('EUR', 'USD', 'GBP') then
    raise exception 'unsupported treasury currency';
  end if;

  insert into public.treasury_entries (
    organization_id, entry_date, concept, amount_cents, currency, status, created_by
  ) values (
    expected_organization_id, target_entry_date, normalized_concept,
    target_amount_cents, normalized_currency::char(3), 'draft', auth.uid()
  ) returning id into created_id;

  insert into public.treasury_events (
    organization_id, entry_id, kind, from_status, to_status, note, actor_profile_id
  ) values (
    expected_organization_id, created_id, 'created', null, 'draft',
    'Movimiento sintético creado.', auth.uid()
  );

  return created_id;
end;
$$;

create or replace function public.update_treasury_draft(
  target_entry_id uuid,
  expected_organization_id uuid,
  target_entry_date date,
  target_concept text,
  target_amount_cents bigint,
  target_currency text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_entry public.treasury_entries%rowtype;
  normalized_concept text := btrim(target_concept);
  normalized_currency text := upper(btrim(target_currency));
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_permission(expected_organization_id, 'treasury.entries.manage') then
    raise exception 'permission denied';
  end if;

  select * into current_entry
  from public.treasury_entries
  where id = target_entry_id and organization_id = expected_organization_id
  for update;
  if not found then raise exception 'treasury entry not found'; end if;
  if current_entry.status <> 'draft' then raise exception 'only drafts can be edited'; end if;
  if target_entry_date is null or char_length(normalized_concept) not between 3 and 160 then
    raise exception 'invalid treasury input';
  end if;
  if target_amount_cents = 0 or target_amount_cents not between -100000000 and 100000000 then
    raise exception 'invalid treasury amount';
  end if;
  if normalized_currency not in ('EUR', 'USD', 'GBP') then
    raise exception 'unsupported treasury currency';
  end if;

  update public.treasury_entries
  set entry_date = target_entry_date,
      concept = normalized_concept,
      amount_cents = target_amount_cents,
      currency = normalized_currency::char(3),
      updated_at = now()
  where id = target_entry_id;

  insert into public.treasury_events (
    organization_id, entry_id, kind, from_status, to_status, note, actor_profile_id
  ) values (
    expected_organization_id, target_entry_id, 'updated', 'draft', 'draft',
    'Borrador sintético actualizado.', auth.uid()
  );
end;
$$;

create or replace function public.transition_treasury_entry(
  target_entry_id uuid,
  target_status public.treasury_entry_status,
  transition_note text,
  expected_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_entry public.treasury_entries%rowtype;
  normalized_note text := btrim(transition_note);
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_permission(expected_organization_id, 'treasury.entries.manage') then
    raise exception 'permission denied';
  end if;

  select * into current_entry
  from public.treasury_entries
  where id = target_entry_id and organization_id = expected_organization_id
  for update;
  if not found then raise exception 'treasury entry not found'; end if;
  if char_length(normalized_note) not between 3 and 1000 then raise exception 'transition note required'; end if;
  if not (
    (current_entry.status = 'draft' and target_status = 'registered') or
    (current_entry.status = 'registered' and target_status = 'reconciled') or
    (current_entry.status = 'reconciled' and target_status = 'validated') or
    (current_entry.status = 'validated' and target_status = 'closed')
  ) then
    raise exception 'invalid treasury transition';
  end if;

  update public.treasury_entries
  set status = target_status, updated_at = now()
  where id = target_entry_id;

  insert into public.treasury_events (
    organization_id, entry_id, kind, from_status, to_status, note, actor_profile_id
  ) values (
    expected_organization_id, target_entry_id, 'status', current_entry.status,
    target_status, normalized_note, auth.uid()
  );
end;
$$;

revoke all on function public.create_treasury_entry(uuid, date, text, bigint, text) from public, anon;
revoke all on function public.update_treasury_draft(uuid, uuid, date, text, bigint, text) from public, anon;
revoke all on function public.transition_treasury_entry(uuid, public.treasury_entry_status, text, uuid) from public, anon;
grant execute on function public.create_treasury_entry(uuid, date, text, bigint, text) to authenticated;
grant execute on function public.update_treasury_draft(uuid, uuid, date, text, bigint, text) to authenticated;
grant execute on function public.transition_treasury_entry(uuid, public.treasury_entry_status, text, uuid) to authenticated;

alter table public.treasury_events enable row level security;

drop policy if exists "authorized members can read treasury" on public.treasury_entries;
create policy "authorized members can read treasury"
on public.treasury_entries for select
to authenticated
using (private.has_permission(organization_id, 'treasury.entries.view'));

create policy "authorized members can read treasury events"
on public.treasury_events for select
to authenticated
using (private.has_permission(organization_id, 'treasury.entries.view'));

revoke all on table public.treasury_entries, public.treasury_events from public, anon;
revoke insert, update, delete on table public.treasury_entries, public.treasury_events from authenticated;
grant select on table public.treasury_entries, public.treasury_events to authenticated;
revoke all on type public.treasury_entry_status from public, anon;
grant usage on type public.treasury_entry_status to authenticated;
