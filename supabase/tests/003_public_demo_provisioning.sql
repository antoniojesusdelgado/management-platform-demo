begin;
select plan(13);

insert into auth.users (
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  'a0000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'oauth-user@example.test',
  '{"provider":"google","providers":["google"]}',
  '{"full_name":"Real OAuth Name","avatar_url":"https://example.test/avatar.png"}',
  now(),
  now()
);

select is(
  (select display_name from public.profiles where id = 'a0000000-0000-4000-8000-000000000001'),
  'Usuario demo A00000',
  'the application profile uses a synthetic alias'
);
select is(
  (select email from public.profiles where id = 'a0000000-0000-4000-8000-000000000001'),
  null::text,
  'the OAuth email is not copied into the application profile'
);
select is(
  (select avatar_url from public.profiles where id = 'a0000000-0000-4000-8000-000000000001'),
  null::text,
  'the OAuth avatar is not copied into the application profile'
);
select is(
  (
    select count(*)
    from public.memberships
    where profile_id = 'a0000000-0000-4000-8000-000000000001'
      and status = 'active'
  ),
  1::bigint,
  'Google sign-in provisions one active membership'
);
select is(
  (
    select organization_id
    from public.memberships
    where profile_id = 'a0000000-0000-4000-8000-000000000001'
  ),
  (
    select id
    from public.organizations
    where slug = 'demo-a0000000000040008000000000000001'
  ),
  'the membership belongs to the isolated demo workspace'
);
select is(
  (
    select count(*)
    from public.role_permissions
    where role_id = (
      select role_id
      from public.memberships
      where profile_id = 'a0000000-0000-4000-8000-000000000001'
    )
  ),
  (select count(*) from public.permissions),
  'the demo role receives every stable permission'
);
select is(
  (
    select count(*)
    from public.module_settings
    where organization_id = (
      select organization_id
      from public.memberships
      where profile_id = 'a0000000-0000-4000-8000-000000000001'
    )
      and enabled
  ),
  9::bigint,
  'all modules are enabled in the demo workspace'
);
select is(
  (
    select count(*)
    from public.audit_events
    where actor_profile_id = 'a0000000-0000-4000-8000-000000000001'
      and event_type = 'workspace.provisioned'
  ),
  1::bigint,
  'workspace provisioning is audited'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.ensure_public_demo_workspace(),
  (
    select organization_id
    from public.memberships
    where profile_id = auth.uid()
  ),
  'the authenticated provisioning RPC is idempotent'
);
select is(
  (select count(*) from public.memberships where profile_id = auth.uid()),
  1::bigint,
  'repeated provisioning does not create another membership'
);

reset role;

select function_privs_are(
  'public',
  'ensure_public_demo_workspace',
  array[]::text[],
  'authenticated',
  array['EXECUTE'],
  'authenticated users can ensure their own demo workspace'
);
select function_privs_are(
  'public',
  'ensure_public_demo_workspace',
  array[]::text[],
  'anon',
  array[]::text[],
  'anonymous users cannot provision a demo workspace'
);
select function_privs_are(
  'private',
  'provision_public_demo_workspace',
  array['uuid'],
  'authenticated',
  array[]::text[],
  'authenticated users cannot call the internal provisioner directly'
);

select * from finish();
rollback;
