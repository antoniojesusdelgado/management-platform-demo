alter table public.organizations
  add column if not exists scenario_v7_backfilled_at timestamptz;

alter table public.treasury_entries
  drop constraint if exists treasury_entries_source_check;
alter table public.treasury_entries
  add constraint treasury_entries_source_check
  check (
    source in (
      'Financial Source A',
      'Financial Source B',
      'Manual',
      'Scenario V7'
    )
  );

alter table public.scenario_evolution_events
  drop constraint if exists scenario_evolution_events_event_type_check;
alter table public.scenario_evolution_events
  add constraint scenario_evolution_events_event_type_check
  check (
    event_type in ('generated', 'workforce_adjustment', 'backfilled')
  );

create or replace function private.ensure_v1_3_1_release(
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

  insert into public.changelog_entries (
    id, organization_id, version, title, summary, status,
    published_at, created_by, created_at, updated_at
  )
  values (
    private.demo_uuid(target_organization_id, 'changelog-v7-release', 2),
    target_organization_id,
    '1.3.1',
    'Corrección responsive y seguridad',
    'Tareas móviles, backfill aditivo y controles de seguridad reforzados.',
    'published'::public.changelog_status,
    timestamptz '2026-07-29 10:00:00+00',
    actor_profile_id,
    timestamptz '2026-07-29 10:00:00+00',
    timestamptz '2026-07-29 10:00:00+00'
  )
  on conflict (organization_id, version) do nothing;
end;
$$;

revoke all on function private.ensure_v1_3_1_release(uuid, uuid)
from public, anon, authenticated;

create or replace function private.scenario_v7_workforce_start_date(
  sequence_number integer
)
returns date
language sql
immutable
set search_path = ''
as $$
  select case
    when sequence_number between 1 and 100 then date '2025-01-01'
    when sequence_number between 101 and 145 then
      date '2025-01-02'
      + floor((sequence_number - 101) * 178.0 / 44.0)::integer
    when sequence_number between 146 and 183 then
      date '2025-09-01'
      + floor((sequence_number - 146) * 120.0 / 37.0)::integer
    when sequence_number between 184 and 218 then
      date '2026-01-02'
      + floor((sequence_number - 184) * 87.0 / 34.0)::integer
    when sequence_number between 219 and 256 then
      date '2026-05-01'
      + floor((sequence_number - 219) * 59.0 / 37.0)::integer
    when sequence_number between 257 and 266 then
      date '2026-07-03' + ((sequence_number - 257) * 7)
    else null
  end
$$;

revoke all on function private.scenario_v7_workforce_start_date(integer)
from public, anon, authenticated;

create or replace function private.scenario_v7_workforce_end_date(
  sequence_number integer
)
returns date
language sql
immutable
set search_path = ''
as $$
  select case
    when sequence_number between 98 and 100 then
      date '2025-08-04' + (sequence_number - 98)
    when sequence_number between 177 and 179 then
      date '2026-04-13' + (sequence_number - 177)
    when sequence_number between 247 and 256 then
      date '2026-07-05' + ((sequence_number - 247) * 7)
    else null
  end
$$;

revoke all on function private.scenario_v7_workforce_end_date(integer)
from public, anon, authenticated;

create or replace function private.correct_demo_scenario_v7_people(
  target_organization_id uuid,
  target_through date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  corrected_people integer := 0;
begin
  if target_organization_id is null or target_through is null then
    raise exception 'organization and target date are required';
  end if;

  update public.people person
  set employment_start_date =
        private.scenario_v7_workforce_start_date(candidate.item),
      employment_end_date =
        private.scenario_v7_workforce_end_date(candidate.item),
      status = case
        when private.scenario_v7_workforce_end_date(candidate.item)
          is not null
          and private.scenario_v7_workforce_end_date(candidate.item)
            <= target_through
          then 'inactive'::public.person_status
        when private.scenario_v7_workforce_start_date(candidate.item)
          > target_through
          then 'invited'::public.person_status
        else 'active'::public.person_status
      end
  from generate_series(1, 266) candidate(item)
  where person.organization_id = target_organization_id
    and person.id = private.demo_uuid(
      target_organization_id,
      'person-v7',
      candidate.item
    )
    and person.display_name like 'Persona sint%'
    and person.updated_at = person.created_at
    and (
      person.employment_start_date is distinct from
        private.scenario_v7_workforce_start_date(candidate.item)
      or person.employment_end_date is distinct from
        private.scenario_v7_workforce_end_date(candidate.item)
      or person.status is distinct from case
        when private.scenario_v7_workforce_end_date(candidate.item)
          is not null
          and private.scenario_v7_workforce_end_date(candidate.item)
            <= target_through
          then 'inactive'::public.person_status
        when private.scenario_v7_workforce_start_date(candidate.item)
          > target_through
          then 'invited'::public.person_status
        else 'active'::public.person_status
      end
    );

  get diagnostics corrected_people = row_count;
  return corrected_people;
end;
$$;

revoke all on function private.correct_demo_scenario_v7_people(uuid, date)
from public, anon, authenticated;

create or replace function private.backfill_demo_scenario_v7(
  target_organization_id uuid,
  actor_profile_id uuid,
  target_through date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_counts jsonb;
  corrected_people integer;
  existing_people integer;
begin
  if target_organization_id is null
    or actor_profile_id is null
    or target_through is null
  then
    raise exception 'organization, actor and target date are required';
  end if;

  if not exists (
    select 1
    from public.memberships membership
    where membership.organization_id = target_organization_id
      and membership.profile_id = actor_profile_id
      and membership.status = 'active'
  ) then
    raise exception 'active organization membership required';
  end if;

  perform 1
  from public.organizations organization
  where organization.id = target_organization_id
  for update;

  select count(*)
  into existing_people
  from public.people person
  where person.organization_id = target_organization_id;

  insert into public.people (
    id, organization_id, display_name, team, position_title, status,
    role_code, employment_contract_type, employment_start_date,
    employment_end_date, created_at, updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'person-v7', candidate.item),
    target_organization_id,
    'Persona sintética ' || lpad(candidate.item::text, 3, '0'),
    (array[
      'Operaciones', 'Producto', 'Tecnología',
      'Atención', 'Finanzas', 'Personas'
    ])[1 + mod(candidate.item - 1, 6)],
    case when mod(candidate.item, 9) = 1 then 'Responsable de equipo'
      else 'Especialista de operaciones'
    end,
    case
      when private.scenario_v7_workforce_end_date(candidate.item)
        is not null
        and private.scenario_v7_workforce_end_date(candidate.item)
          <= target_through
        then 'inactive'::public.person_status
      else 'active'::public.person_status
    end,
    case when mod(candidate.item, 9) = 1 then 'manager'
      else 'collaborator'
    end::public.person_role_code,
    case
      when mod(candidate.item, 16) = 0 then 'temporary_substitution'
      when mod(candidate.item, 11) = 0 then 'temporary_production'
      when mod(candidate.item, 9) = 0 then 'permanent_discontinuous'
      else 'indefinite_ordinary'
    end,
    private.scenario_v7_workforce_start_date(candidate.item),
    private.scenario_v7_workforce_end_date(candidate.item),
    private.scenario_v7_workforce_start_date(candidate.item) + time '09:00',
    private.scenario_v7_workforce_start_date(candidate.item) + time '09:00'
  from generate_series(existing_people + 1, 266) candidate(item)
  where private.scenario_v7_workforce_start_date(candidate.item)
    <= target_through
  on conflict (id) do nothing;

  with months as (
    select month_start::date,
      least(
        target_through,
        (month_start + interval '1 month - 1 day')::date
      ) as month_end,
      row_number() over (order by month_start) as sequence_number
    from generate_series(
      date '2025-01-01',
      date_trunc('month', target_through)::date,
      interval '1 month'
    ) month_start
  )
  insert into public.payroll_runs (
    id, organization_id, period_start, period_end, people_count,
    gross_total_cents, deduction_total_cents, currency, notes, status,
    created_by, created_at, updated_at
  )
  select
    private.demo_uuid(
      target_organization_id,
      'payroll-v7-' || to_char(month.month_start, 'YYYY-MM'),
      1
    ),
    target_organization_id,
    date '2099-01-01' + month.sequence_number::integer,
    date '2099-01-01' + month.sequence_number::integer,
    1,
    1,
    0,
    'EUR',
    '__scenario_v7_conflict_guard__',
    'closed'::public.payroll_run_status,
    actor_profile_id,
    now(),
    now()
  from months month
  where exists (
    select 1
    from public.payroll_runs run
    where run.organization_id = target_organization_id
      and run.period_start = month.month_start
      and run.period_end = month.month_end
  )
  on conflict (id) do nothing;

  generated_counts := private.generate_demo_scenario_v7_interval(
    target_organization_id,
    actor_profile_id,
    date '2025-01-01',
    target_through
  );

  delete from public.payroll_runs run
  where run.organization_id = target_organization_id
    and run.notes = '__scenario_v7_conflict_guard__';

  corrected_people := private.correct_demo_scenario_v7_people(
    target_organization_id,
    target_through
  );
  perform private.ensure_v1_3_1_release(
    target_organization_id,
    actor_profile_id
  );
  generated_counts := generated_counts || jsonb_build_object(
    'correctedPeople',
    corrected_people
  );

  update public.organizations
  set scenario_version = 7,
      scenario_anchor_date = target_through,
      scenario_generated_through_date = target_through,
      scenario_v7_backfilled_at = now(),
      updated_at = now()
  where id = target_organization_id;

  insert into public.scenario_evolution_events (
    id, organization_id, event_date, event_type,
    from_date, through_date, generated_counts
  )
  values (
    private.demo_uuid(
      target_organization_id,
      'scenario-v7-backfill',
      1
    ),
    target_organization_id,
    target_through,
    'backfilled',
    date '2025-01-01',
    target_through,
    generated_counts
  )
  on conflict (organization_id, event_date, event_type)
  do update set generated_counts = excluded.generated_counts;

  insert into public.audit_events (
    organization_id, actor_profile_id, event_type,
    entity_type, entity_id, metadata
  )
  values (
    target_organization_id,
    actor_profile_id,
    'demo.scenario.v7_backfilled',
    'demo_scenario',
    target_organization_id,
    jsonb_build_object(
      'scenario_version', 7,
      'from', date '2025-01-01',
      'through', target_through,
      'counts', generated_counts,
      'synthetic_only', true,
      'preserved_existing_rows', true
    )
  );

  return generated_counts;
end;
$$;

revoke all on function private.backfill_demo_scenario_v7(uuid, uuid, date)
from public, anon, authenticated;

create or replace function public.ensure_demo_scenario_current(
  expected_organization_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_through date;
  backfilled_at timestamptz;
  target_through date := timezone('Europe/Madrid', now())::date - 1;
  generated_counts jsonb := '{}'::jsonb;
  corrected_people integer := 0;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if expected_organization_id is null
    or not private.is_org_member(expected_organization_id)
  then
    raise exception 'permission denied';
  end if;

  select
    organization.scenario_generated_through_date,
    organization.scenario_v7_backfilled_at
  into generated_through, backfilled_at
  from public.organizations organization
  where organization.id = expected_organization_id
  for update;

  if generated_through is null then
    raise exception 'organization not found';
  end if;

  if backfilled_at is null then
    generated_counts := private.backfill_demo_scenario_v7(
      expected_organization_id,
      auth.uid(),
      target_through
    );
    return jsonb_build_object(
      'from', date '2025-01-01',
      'through', target_through,
      'generated', true,
      'backfilled', true,
      'counts', generated_counts
    );
  end if;

  if generated_through >= target_through then
    return jsonb_build_object(
      'from', generated_through,
      'through', generated_through,
      'generated', false,
      'backfilled', true,
      'counts', '{}'::jsonb
    );
  end if;

  generated_counts := private.generate_demo_scenario_v7_interval(
    expected_organization_id,
    auth.uid(),
    generated_through + 1,
    target_through
  );
  corrected_people := private.correct_demo_scenario_v7_people(
    expected_organization_id,
    target_through
  );
  generated_counts := generated_counts || jsonb_build_object(
    'correctedPeople',
    corrected_people
  );

  update public.organizations
  set scenario_version = 7,
      scenario_anchor_date = target_through,
      scenario_generated_through_date = target_through,
      updated_at = now()
  where id = expected_organization_id;

  insert into public.scenario_evolution_events (
    id, organization_id, event_date, event_type,
    from_date, through_date, generated_counts
  )
  values (
    private.demo_uuid(
      expected_organization_id,
      'scenario-v7-' || target_through::text,
      1
    ),
    expected_organization_id,
    target_through,
    'generated',
    generated_through + 1,
    target_through,
    generated_counts
  )
  on conflict (organization_id, event_date, event_type) do nothing;

  insert into public.audit_events (
    organization_id, actor_profile_id, event_type,
    entity_type, entity_id, metadata
  )
  values (
    expected_organization_id,
    auth.uid(),
    'demo.scenario.v7_extended',
    'demo_scenario',
    expected_organization_id,
    jsonb_build_object(
      'scenario_version', 7,
      'from', generated_through + 1,
      'through', target_through,
      'counts', generated_counts,
      'synthetic_only', true
    )
  );

  return jsonb_build_object(
    'from', generated_through + 1,
    'through', target_through,
    'generated', true,
    'backfilled', true,
    'counts', generated_counts
  );
end;
$$;

revoke all on function public.ensure_demo_scenario_current(uuid)
from public, anon;
grant execute on function public.ensure_demo_scenario_current(uuid)
to authenticated;

do $$
declare
  target_through date := timezone('Europe/Madrid', now())::date - 1;
  pending record;
begin
  for pending in
    select
      organization.id as organization_id,
      (
        select membership.profile_id
        from public.memberships membership
        where membership.organization_id = organization.id
          and membership.status = 'active'
        order by membership.joined_at nulls last, membership.created_at
        limit 1
      ) as actor_profile_id
    from public.organizations organization
    where organization.scenario_v7_backfilled_at is null
  loop
    if pending.actor_profile_id is not null then
      perform private.backfill_demo_scenario_v7(
        pending.organization_id,
        pending.actor_profile_id,
        target_through
      );
    end if;
  end loop;
end;
$$;

create table if not exists private.api_rate_limit_events (
  id bigint generated always as identity primary key,
  subject_key text not null,
  request_path text not null,
  requested_at timestamptz not null default now()
);

create index if not exists api_rate_limit_subject_requested_idx
  on private.api_rate_limit_events (subject_key, requested_at desc);

revoke all on private.api_rate_limit_events
from public, anon, authenticated;

create or replace function public.check_management_request_rate_limit()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_method text := current_setting('request.method', true);
  rate_request_path text := coalesce(
    current_setting('request.path', true),
    'unknown'
  );
  request_headers jsonb := coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb,
    '{}'::jsonb
  );
  request_ip text;
  rate_subject_key text;
  request_limit integer := 120;
  request_count integer;
begin
  if request_method is null
    or request_method in ('GET', 'HEAD', 'OPTIONS')
  then
    return;
  end if;

  request_ip := coalesce(
    nullif(
      trim(split_part(request_headers ->> 'x-forwarded-for', ',', 1)),
      ''
    ),
    'unknown'
  );
  rate_subject_key := md5(
    coalesce(auth.uid()::text, 'ip:' || request_ip)
  );

  if trim(leading '/' from rate_request_path) in (
    'rpc/restore_demo_scenario',
    'rpc/simulate_integration_run',
    'rpc/ensure_demo_scenario_current'
  ) then
    request_limit := 10;
  end if;

  delete from private.api_rate_limit_events event
  where event.subject_key = rate_subject_key
    and event.requested_at < now() - interval '10 minutes';

  select count(*)
  into request_count
  from private.api_rate_limit_events event
  where event.subject_key = rate_subject_key
    and event.request_path = rate_request_path
    and event.requested_at >= now() - interval '1 minute';

  if request_count >= request_limit then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'rate_limit_exceeded',
        'message', 'Demasiadas solicitudes. Intentalo de nuevo en un minuto.',
        'details', null,
        'hint', null
      )::text,
      detail = json_build_object(
        'status', 429,
        'status_text', 'Too Many Requests',
        'headers', json_build_object('Retry-After', '60')
      )::text;
  end if;

  insert into private.api_rate_limit_events (
    subject_key,
    request_path
  )
  values (
    rate_subject_key,
    left(rate_request_path, 160)
  );
end;
$$;

revoke all on function public.check_management_request_rate_limit()
from public, anon, authenticated;
grant execute on function public.check_management_request_rate_limit()
to authenticator;

alter role authenticator
  set pgrst.db_pre_request = 'public.check_management_request_rate_limit';
notify pgrst, 'reload config';

revoke execute on function public.mark_demo_scenario_v2_restored(uuid, text)
from authenticated;
revoke execute on function public.restore_demo_scenario_v3()
from authenticated;
revoke execute on function public.restore_demo_scenario_v4()
from authenticated;
revoke execute on function public.restore_demo_scenario_v5()
from authenticated;
revoke execute on function public.restore_demo_scenario_v6()
from authenticated;
