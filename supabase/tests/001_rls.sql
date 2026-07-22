begin;
select plan(15);

select has_schema('private', 'private helper schema exists');
select has_table('public', 'memberships', 'memberships table exists');
select has_table('public', 'leave_requests', 'leave requests table exists');
select has_table('public', 'leave_request_events', 'immutable history exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.leave_requests'::regclass),
  true,
  'leave requests have RLS enabled'
);
select is(
  (
    select bool_and(c.relrowsecurity)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any(array[
        'organizations', 'profiles', 'roles', 'permissions',
        'role_permissions', 'memberships', 'invitations',
        'organization_settings', 'module_settings', 'leave_policies',
        'leave_requests', 'leave_request_events', 'tasks',
        'task_dependencies', 'task_comments', 'task_events', 'incidents',
        'treasury_entries', 'payroll_runs', 'people', 'changelog_entries',
        'audit_events'
      ])
  ),
  true,
  'every exposed application table has RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.memberships'::regclass),
  true,
  'memberships have RLS enabled'
);
select function_privs_are(
  'private',
  'has_permission',
  array['uuid', 'text'],
  'authenticated',
  array['EXECUTE'],
  'authenticated can execute the permission helper'
);
select function_privs_are(
  'private',
  'has_permission',
  array['uuid', 'text'],
  'anon',
  array[]::text[],
  'anonymous users cannot execute the permission helper'
);
select function_privs_are(
  'private',
  'is_org_member',
  array['uuid'],
  'anon',
  array[]::text[],
  'anonymous users cannot execute the membership helper'
);
select is(
  (
    select p.proconfig @> array['search_path=""']
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'has_permission'
  ),
  true,
  'permission helper uses an empty search path'
);
select function_privs_are(
  'public',
  'transition_leave_request',
  array['uuid', 'leave_request_status', 'text', 'uuid'],
  'anon',
  array[]::text[],
  'anonymous users cannot transition leave requests'
);
select function_privs_are(
  'public',
  'transition_task',
  array['uuid', 'task_status', 'text', 'uuid'],
  'anon',
  array[]::text[],
  'anonymous users cannot transition tasks'
);
select is(
  has_table_privilege('authenticated', 'public.organizations', 'SELECT'),
  true,
  'authenticated users can select organizations through RLS'
);
select is(
  has_table_privilege('anon', 'public.leave_requests', 'SELECT, INSERT, UPDATE, DELETE'),
  false,
  'anonymous users have no leave request privileges'
);

select * from finish();
rollback;
