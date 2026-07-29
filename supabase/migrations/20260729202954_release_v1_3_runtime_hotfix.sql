-- v1.3.0 runtime follow-up: publish the missing release note and repair
-- known synthetic activity copy without replacing user-authored records.

create or replace function private.ensure_v1_3_release(
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
    id,
    organization_id,
    version,
    title,
    summary,
    status,
    published_at,
    created_by,
    created_at,
    updated_at
  )
  values (
    private.demo_uuid(target_organization_id, 'changelog-v7-release', 1),
    target_organization_id,
    '1.3.0',
    'Tema y experiencia responsive',
    'Tema claro por defecto y oscuro manual, analítica estable y Scenario V7 incremental.',
    'published'::public.changelog_status,
    timestamptz '2026-06-23 10:00:00+00',
    actor_profile_id,
    timestamptz '2026-06-23 10:00:00+00',
    timestamptz '2026-06-23 10:00:00+00'
  )
  on conflict (organization_id, version) do nothing;

  update public.changelog_entries
  set
    published_at = timestamptz '2026-06-23 10:00:00+00',
    updated_at = timestamptz '2026-06-23 10:00:00+00'
  where organization_id = target_organization_id
    and version = '1.3.0'
    and title = 'Tema y experiencia responsive'
    and summary = 'Tema claro por defecto y oscuro manual, analítica estable y Scenario V7 incremental.';
end;
$$;

revoke all on function private.ensure_v1_3_release(uuid, uuid)
from public, anon, authenticated;

select private.ensure_v1_3_release(
  organization.id,
  author.profile_id
)
from public.organizations organization
cross join lateral (
  select membership.profile_id
  from public.memberships membership
  where membership.organization_id = organization.id
  order by
    (membership.status = 'active') desc,
    membership.joined_at nulls last,
    membership.created_at
  limit 1
) author;

alter function private.seed_standard_demo_scenario(uuid, uuid)
  rename to seed_standard_demo_scenario_v6;

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
end;
$$;

revoke all on function private.seed_standard_demo_scenario(uuid, uuid)
from public, anon, authenticated;

update public.profiles
set
  theme = 'light',
  updated_at = now()
where theme = 'system';

alter table public.profiles
  alter column theme set default 'light';

alter table public.profiles
  drop constraint profiles_theme_check;

alter table public.profiles
  add constraint profiles_theme_check
  check (theme in ('light', 'dark'));

update public.people_events
set note = 'Perfil sintético actualizado.'
where note in (
  'Perfil sintÃ©tico actualizado.',
  'Perfil sintÃƒÂ©tico actualizado.',
  'Perfil sintÃƒÆ’Ã‚Â©tico actualizado.'
);
