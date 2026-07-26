begin;
select plan(9);

select is(
  has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
  false,
  'authenticated users cannot update profiles directly'
);
select function_privs_are(
  'public',
  'update_own_profile_preferences',
  array[
    'text',
    'text',
    'text',
    'text',
    'text',
    'boolean',
    'boolean',
    'text',
    'jsonb',
    'person_role_code'
  ],
  'anon',
  array[]::text[],
  'anonymous users cannot execute the profile RPC'
);

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
  'e0000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'profile-user@example.test',
  '{"provider":"google","providers":["google"]}',
  '{}',
  now(),
  now()
);

select set_config(
  'request.jwt.claims',
  '{"sub":"e0000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.update_own_profile_preferences(
    'Perfil demo',
    'en-GB',
    'Atlantic/Canary',
    'dark',
    'compact',
    true,
    true,
    'projects',
    '{"in_app":false,"assignments":true,"reviews":false}'::jsonb,
    'viewer'
  )$$,
  'an active user can update the allowlisted preference fields'
);
select is(
  (select alias from public.profiles where id = auth.uid()),
  'Perfil demo',
  'the alias is updated for the authenticated profile'
);
select is(
  (select timezone from public.profiles where id = auth.uid()),
  'Atlantic/Canary',
  'the timezone is updated for the authenticated profile'
);
select is(
  (select simulated_role from public.profiles where id = auth.uid()),
  'viewer'::public.person_role_code,
  'the role simulator is stored without changing the real membership'
);
select is(
  (
    select role.code
    from public.memberships membership
    join public.roles role on role.id = membership.role_id
    where profile_id = auth.uid()
  ),
  'demo_admin',
  'self-service preferences cannot change the real role'
);
select throws_ok(
  $$select public.update_own_profile_preferences(
    'A',
    'es-ES',
    'Europe/Madrid',
    'light',
    'comfortable',
    false,
    false,
    'control-center',
    '{}'::jsonb,
    null
  )$$,
  'invalid alias',
  'invalid aliases are rejected'
);
select throws_ok(
  $$update public.profiles set alias = 'Direct update' where id = auth.uid()$$,
  '42501',
  null,
  'direct profile updates remain blocked'
);

select * from finish();
rollback;
