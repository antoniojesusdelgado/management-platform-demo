begin;
select plan(29);

select has_schema('private', 'private helper schema exists');
select has_table('public', 'memberships', 'memberships table exists');
select has_table('public', 'leave_requests', 'leave requests table exists');
select has_table('public', 'leave_request_events', 'immutable history exists');
select has_table('public', 'treasury_events', 'Treasury history exists');
select has_table('public', 'payroll_events', 'Payroll history exists');
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
        'incident_events', 'people_events', 'changelog_events',
        'treasury_entries', 'treasury_events', 'payroll_runs', 'payroll_events', 'people', 'changelog_entries',
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
select function_privs_are(
  'public',
  'transition_incident',
  array['uuid', 'incident_status', 'text', 'uuid'],
  'anon',
  array[]::text[],
  'anonymous users cannot transition incidents'
);
select function_privs_are(
  'public', 'transition_changelog_entry',
  array['uuid', 'changelog_status', 'text', 'uuid'], 'anon', array[]::text[],
  'anonymous users cannot transition changelog entries'
);
select function_privs_are(
  'public', 'update_role_permissions',
  array['uuid', 'text[]', 'uuid'], 'anon', array[]::text[],
  'anonymous users cannot change role permissions'
);
select function_privs_are(
  'public', 'update_membership_access',
  array['uuid', 'uuid', 'membership_status', 'uuid'], 'anon', array[]::text[],
  'anonymous users cannot change memberships'
);
select function_privs_are(
  'public', 'update_module_setting',
  array['text', 'boolean', 'integer', 'uuid'], 'anon', array[]::text[],
  'anonymous users cannot configure modules'
);
select function_privs_are(
  'public', 'create_treasury_entry',
  array['uuid', 'date', 'text', 'bigint', 'text'], 'anon', array[]::text[],
  'anonymous users cannot create Treasury entries'
);
select function_privs_are(
  'public', 'update_treasury_draft',
  array['uuid', 'uuid', 'date', 'text', 'bigint', 'text'], 'anon', array[]::text[],
  'anonymous users cannot update Treasury drafts'
);
select function_privs_are(
  'public', 'transition_treasury_entry',
  array['uuid', 'treasury_entry_status', 'text', 'uuid'], 'anon', array[]::text[],
  'anonymous users cannot transition Treasury entries'
);
select function_privs_are(
  'public', 'create_payroll_run',
  array['uuid', 'date', 'date', 'integer', 'bigint', 'bigint', 'text', 'text'], 'anon', array[]::text[],
  'anonymous users cannot create Payroll cycles'
);
select function_privs_are(
  'public', 'update_payroll_collecting_run',
  array['uuid', 'uuid', 'date', 'date', 'integer', 'bigint', 'bigint', 'text', 'text'], 'anon', array[]::text[],
  'anonymous users cannot update Payroll cycles'
);
select function_privs_are(
  'public', 'transition_payroll_run',
  array['uuid', 'payroll_run_status', 'text', 'uuid'], 'anon', array[]::text[],
  'anonymous users cannot transition Payroll cycles'
);
select is(
  (select p.proconfig @> array['search_path=""'] from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'transition_payroll_run'),
  true,
  'Payroll transition function uses an empty search path'
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
