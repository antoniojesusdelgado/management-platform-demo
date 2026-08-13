create table if not exists public.data_erasure_requests (
  id uuid primary key default gen_random_uuid(),
  subject_reference text not null check (char_length(subject_reference) = 64),
  status text not null default 'completed' check (status in ('completed', 'failed')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  retention_until timestamptz not null default (now() + interval '3 years')
);

alter table public.data_erasure_requests enable row level security;
revoke all on table public.data_erasure_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.data_erasure_requests to service_role;

comment on table public.data_erasure_requests is
  'Minimal non-identifying evidence of completed account erasure requests.';

create or replace function private.prepare_own_account_erasure_v1_8_2()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_profile_id uuid := (select auth.uid());
  stored_secret_id uuid;
begin
  if target_profile_id is null then
    raise exception 'authentication required';
  end if;

  for stored_secret_id in
    select connection.token_secret_id
    from public.workspace_connections connection
    where connection.profile_id = target_profile_id
      and connection.token_secret_id is not null
  loop
    delete from vault.secrets where id = stored_secret_id;
  end loop;

  delete from public.workspace_connections
  where profile_id = target_profile_id;

  update public.people
  set profile_id = null,
      updated_at = now()
  where profile_id = target_profile_id;

  update public.memberships
  set status = 'suspended',
      updated_at = now()
  where profile_id = target_profile_id;

  update public.profiles
  set display_name = 'Cuenta eliminada',
      email = null,
      avatar_url = null,
      avatar_path = null,
      alias = null,
      active_organization_id = null,
      notification_preferences = '{}'::jsonb,
      updated_at = now()
  where id = target_profile_id;

  insert into public.data_erasure_requests (
    subject_reference,
    status,
    completed_at
  ) values (
    encode(extensions.digest(target_profile_id::text, 'sha256'), 'hex'),
    'completed',
    now()
  );
end;
$$;

revoke all on function private.prepare_own_account_erasure_v1_8_2() from public, anon;
grant execute on function private.prepare_own_account_erasure_v1_8_2() to authenticated;

comment on function private.prepare_own_account_erasure_v1_8_2() is
  'Disconnects external services and anonymizes the authenticated profile before irreversible Auth soft deletion.';

create or replace function public.prepare_own_account_erasure_v1_8_2()
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.prepare_own_account_erasure_v1_8_2();
$$;

revoke all on function public.prepare_own_account_erasure_v1_8_2() from public, anon;
grant execute on function public.prepare_own_account_erasure_v1_8_2() to authenticated;

comment on function public.prepare_own_account_erasure_v1_8_2() is
  'Invoker wrapper for the authenticated account-erasure workflow.';

insert into public.changelog_entries (
  organization_id,
  version,
  title,
  summary,
  status,
  published_at,
  created_by
)
select
  organization.id,
  '1.8.2',
  'Más control sobre tu privacidad',
  'Ahora puedes decidir si compartes métricas de uso, cambiar esa elección cuando quieras y eliminar tu cuenta desde el perfil.',
  'published',
  '2026-08-12T19:30:00+02:00'::timestamptz,
  membership.profile_id
from public.organizations organization
join lateral (
  select candidate.profile_id
  from public.memberships candidate
  join public.roles role on role.id = candidate.role_id
  where candidate.organization_id = organization.id
    and candidate.status = 'active'
  order by (role.code = 'admin') desc, candidate.created_at
  limit 1
) membership on true
where not exists (
  select 1
  from public.changelog_entries existing
  where existing.organization_id = organization.id
    and existing.version = '1.8.2'
);

update public.changelog_entries
set title = 'Más control sobre tu privacidad',
    summary = 'Ahora puedes decidir si compartes métricas de uso, cambiar esa elección cuando quieras y eliminar tu cuenta desde el perfil.',
    updated_at = now()
where version = '1.8.2'
  and title = 'Acceso más claro y seguro'
  and summary = 'Mejoramos el inicio de sesión, el rendimiento y la protección de la plataforma. Google y Microsoft ahora solicitan solo los permisos necesarios para cada acción.';
