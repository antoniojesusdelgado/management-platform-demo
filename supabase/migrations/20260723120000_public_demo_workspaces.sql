create or replace function private.provision_public_demo_workspace(
  target_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_organization_id uuid;
  new_organization_id uuid := gen_random_uuid();
  new_role_id uuid := gen_random_uuid();
  provider_name text;
begin
  select raw_app_meta_data ->> 'provider'
  into provider_name
  from auth.users
  where id = target_profile_id;

  if provider_name is distinct from 'google' then
    raise exception 'google authentication required';
  end if;

  select organization_id
  into existing_organization_id
  from public.memberships
  where profile_id = target_profile_id
  order by created_at
  limit 1;

  if existing_organization_id is not null then
    return existing_organization_id;
  end if;

  insert into public.organizations (id, name, slug)
  values (
    new_organization_id,
    'Workspace demo',
    'demo-' || replace(target_profile_id::text, '-', '')
  );

  insert into public.roles (
    id,
    organization_id,
    code,
    name,
    color,
    is_system
  )
  values (
    new_role_id,
    new_organization_id,
    'demo_admin',
    'Acceso completo',
    '#2563eb',
    true
  );

  insert into public.role_permissions (role_id, permission_id)
  select new_role_id, id
  from public.permissions;

  insert into public.memberships (
    organization_id,
    profile_id,
    role_id,
    status,
    joined_at
  )
  values (
    new_organization_id,
    target_profile_id,
    new_role_id,
    'active',
    now()
  );

  insert into public.organization_settings (organization_id)
  values (new_organization_id);

  insert into public.module_settings (
    organization_id,
    module_id,
    enabled,
    sort_order
  )
  select
    new_organization_id,
    module_id,
    true,
    sort_order
  from (
    values
      ('inicio', 0),
      ('vacaciones', 1),
      ('tareas', 2),
      ('incidencias', 3),
      ('tesoreria', 4),
      ('nominas', 5),
      ('personal', 6),
      ('novedades', 7),
      ('configuracion', 8)
  ) as modules(module_id, sort_order);

  insert into public.leave_policies (
    organization_id,
    name,
    annual_days,
    requires_approval
  )
  values (
    new_organization_id,
    'Política sintética',
    23,
    true
  );

  insert into public.audit_events (
    organization_id,
    actor_profile_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    new_organization_id,
    target_profile_id,
    'workspace.provisioned',
    'organization',
    new_organization_id,
    jsonb_build_object('mode', 'public_demo', 'data', 'synthetic')
  );

  return new_organization_id;
end;
$$;

revoke all on function private.provision_public_demo_workspace(uuid)
from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    'Usuario demo ' || upper(left(replace(new.id::text, '-', ''), 6)),
    null,
    null
  )
  on conflict (id) do update
  set display_name = excluded.display_name,
      email = null,
      avatar_url = null,
      updated_at = now();

  if new.raw_app_meta_data ->> 'provider' = 'google' then
    perform private.provision_public_demo_workspace(new.id);
  end if;

  return new;
end;
$$;

revoke all on function private.handle_new_user()
from public, anon, authenticated;

create or replace function public.ensure_public_demo_workspace()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  return private.provision_public_demo_workspace(auth.uid());
end;
$$;

revoke all on function public.ensure_public_demo_workspace()
from public, anon;
grant execute on function public.ensure_public_demo_workspace()
to authenticated;

comment on function public.ensure_public_demo_workspace() is
  'Idempotently provisions one isolated, synthetic workspace for the authenticated Google user.';
