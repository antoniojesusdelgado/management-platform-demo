begin;
select plan(16);

select has_table('public', 'projects', 'projects table exists');
select has_table(
  'public',
  'project_members',
  'project membership table exists'
);
select has_table(
  'public',
  'project_events',
  'immutable project history exists'
);
select is(
  (
    select bool_and(relrowsecurity)
    from pg_class
    where oid = any(array[
      'public.projects'::regclass,
      'public.project_members'::regclass,
      'public.project_events'::regclass
    ])
  ),
  true,
  'all project tables have RLS enabled'
);
select is(
  has_table_privilege('anon', 'public.projects', 'SELECT, INSERT, UPDATE, DELETE'),
  false,
  'anonymous users have no project privileges'
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
  'b0000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'projects-user@example.test',
  '{"provider":"google","providers":["google"]}',
  '{}',
  now(),
  now()
);

select is(
  (
    select count(*)
    from public.people
    where profile_id = 'b0000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'workspace provisioning creates one linked person'
);
select is(
  (
    select count(*)
    from public.module_settings setting
    join public.memberships membership
      on membership.organization_id = setting.organization_id
    where membership.profile_id = 'b0000000-0000-4000-8000-000000000001'
      and setting.module_id = 'proyectos'
      and setting.enabled
  ),
  1::bigint,
  'the Projects module is enabled for the provisioned workspace'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select ok(
  private.has_permission(
    (select organization_id from public.memberships where profile_id = auth.uid()),
    'projects.items.manage'
  ),
  'the real demo admin role can manage projects'
);

select lives_ok(
  $$select public.update_own_profile_preferences(
    'Project viewer',
    'es-ES',
    'Europe/Madrid',
    'system',
    'comfortable',
    false,
    false,
    'analytics',
    '{"in_app":true,"assignments":true,"reviews":true}'::jsonb,
    'viewer'
  )$$,
  'a user can activate the viewer simulation through the self-service RPC'
);

select ok(
  private.has_permission(
    (select organization_id from public.memberships where profile_id = auth.uid()),
    'projects.items.view'
  ),
  'viewer simulation preserves project read access'
);
select isnt(
  private.has_permission(
    (select organization_id from public.memberships where profile_id = auth.uid()),
    'projects.items.manage'
  ),
  true,
  'viewer simulation removes project management'
);
select isnt(
  private.has_permission(
    (select organization_id from public.memberships where profile_id = auth.uid()),
    'settings.workspace.manage'
  ),
  true,
  'viewer simulation cannot retain administrative settings access'
);
select ok(
  private.has_permission(
    (select organization_id from public.memberships where profile_id = auth.uid()),
    'profile.self.update'
  ),
  'viewer simulation preserves self-service profile access'
);

select lives_ok(
  $$select public.update_own_profile_preferences(
    'Project viewer',
    'es-ES',
    'Europe/Madrid',
    'system',
    'comfortable',
    false,
    false,
    'analytics',
    '{"in_app":true,"assignments":true,"reviews":true}'::jsonb,
    null
  )$$,
  'a user can safely leave simulated mode'
);

insert into public.projects (
  organization_id,
  code,
  name,
  summary,
  owner_person_id,
  created_by
)
select
  membership.organization_id,
  'SAFE-01',
  'Proyecto de aislamiento',
  'Proyecto sintético para validar RLS.',
  person.id,
  membership.profile_id
from public.memberships membership
join public.people person
  on person.organization_id = membership.organization_id
 and person.profile_id = membership.profile_id
where membership.profile_id = auth.uid();

select is(
  (select count(*) from public.projects),
  11::bigint,
  'an authorized user can add an own-workspace project to the scenario'
);
select is(
  (
    select count(*)
    from public.project_events
    where project_id = (select id from public.projects where code = 'SAFE-01')
      and kind = 'created'
  ),
  1::bigint,
  'project creation is recorded as an immutable event'
);

select * from finish();
rollback;
