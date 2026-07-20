begin;
select plan(8);

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
  'public',
  'transition_leave_request',
  array['uuid', 'leave_request_status', 'text', 'uuid'],
  'anon',
  array[]::text[],
  'anonymous users cannot transition leave requests'
);

select * from finish();
rollback;
