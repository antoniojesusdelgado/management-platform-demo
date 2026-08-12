alter table public.workspace_connections
  add column if not exists granted_scopes text[] not null default '{}',
  add column if not exists account_kind text not null default 'unknown'
    check (account_kind in ('unknown', 'consumer', 'corporate')),
  add column if not exists directory_authorized boolean not null default false;

create or replace function private.save_workspace_connection_v1_8_1(
  expected_organization_id uuid,
  expected_profile_id uuid,
  target_provider text,
  target_account_label text,
  target_capabilities text[],
  target_granted_scopes text[],
  target_account_kind text,
  target_directory_authorized boolean,
  target_access_token text,
  target_refresh_token text,
  target_expires_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  connection_id uuid;
begin
  if (select auth.uid()) is null
     or (select auth.uid()) <> expected_profile_id
     or not private.is_org_member(expected_organization_id) then
    raise exception 'permission denied';
  end if;
  if target_account_kind not in ('unknown', 'consumer', 'corporate') then
    raise exception 'invalid account kind';
  end if;
  if coalesce(cardinality(target_granted_scopes), 0) > 32 then
    raise exception 'too many scopes';
  end if;

  connection_id := private.save_workspace_connection_secret(
    expected_organization_id,
    expected_profile_id,
    target_provider,
    target_account_label,
    target_capabilities,
    target_access_token,
    target_refresh_token,
    target_expires_at
  );

  update public.workspace_connections
  set granted_scopes = coalesce(target_granted_scopes, '{}'),
      account_kind = target_account_kind,
      directory_authorized = target_directory_authorized,
      updated_at = now()
  where id = connection_id
    and organization_id = expected_organization_id
    and profile_id = expected_profile_id;

  if private.has_permission(expected_organization_id, 'settings.workspace.manage') then
    update public.organization_directory_settings
    set status = case when target_directory_authorized then 'ready' else 'not_configured' end,
        last_error_code = case
          when target_directory_authorized then null
          when target_account_kind = 'consumer' then 'corporate_account_required'
          else 'admin_consent_required'
        end,
        updated_at = now()
    where organization_id = expected_organization_id
      and provider = target_provider;
  end if;

  return connection_id;
end;
$$;

create or replace function public.save_workspace_connection_v1_8_1(
  expected_organization_id uuid,
  expected_profile_id uuid,
  target_provider text,
  target_account_label text,
  target_capabilities text[],
  target_granted_scopes text[],
  target_account_kind text,
  target_directory_authorized boolean,
  target_access_token text,
  target_refresh_token text,
  target_expires_at timestamptz
) returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.save_workspace_connection_v1_8_1(
    expected_organization_id,
    expected_profile_id,
    target_provider,
    target_account_label,
    target_capabilities,
    target_granted_scopes,
    target_account_kind,
    target_directory_authorized,
    target_access_token,
    target_refresh_token,
    target_expires_at
  );
$$;

revoke all on function private.save_workspace_connection_v1_8_1(uuid,uuid,text,text,text[],text[],text,boolean,text,text,timestamptz) from public, anon;
grant execute on function private.save_workspace_connection_v1_8_1(uuid,uuid,text,text,text[],text[],text,boolean,text,text,timestamptz) to authenticated;
revoke all on function public.save_workspace_connection_v1_8_1(uuid,uuid,text,text,text[],text[],text,boolean,text,text,timestamptz) from public, anon;
grant execute on function public.save_workspace_connection_v1_8_1(uuid,uuid,text,text,text[],text[],text,boolean,text,text,timestamptz) to authenticated;

update public.workspace_connections
set granted_scopes = '{}',
    account_kind = 'unknown',
    directory_authorized = false
where granted_scopes = '{}';

update public.organization_directory_settings settings
set status = 'not_configured',
    last_error_code = 'permission_verification_required_v1_8_1',
    updated_at = now()
where exists (
  select 1
  from public.workspace_connections connection
  where connection.organization_id = settings.organization_id
    and connection.provider = settings.provider
    and connection.status = 'connected'
    and not connection.directory_authorized
);

insert into public.changelog_entries (
  organization_id, version, title, summary, status, published_at, created_by
)
select organization.id,
  '1.8.1',
  'Una experiencia más clara y ágil',
  'El acceso, la navegación, la creación de empresas, las notificaciones y las conexiones corporativas son ahora más sencillos y predecibles.',
  'published',
  now(),
  creator.profile_id
from public.organizations organization
cross join lateral (
  select membership.profile_id
  from public.memberships membership
  where membership.organization_id = organization.id
    and membership.status = 'active'
  order by membership.created_at
  limit 1
) creator
where not exists (
  select 1 from public.changelog_entries existing
  where existing.organization_id = organization.id
    and existing.version = '1.8.1'
);
