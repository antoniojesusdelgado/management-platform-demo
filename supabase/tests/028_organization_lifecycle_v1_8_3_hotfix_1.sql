begin;

select plan(15);

select has_table('private', 'platform_administrators', 'platform administrators are stored outside the Data API');
select has_table('private', 'organization_deletion_audit', 'organization deletions keep a private audit trail');
select function_privs_are('public', 'is_platform_administrator_v1_8_3_hotfix_1', array[]::text[], 'anon', array[]::text[], 'anonymous users cannot inspect platform administration');
select function_privs_are('public', 'is_platform_administrator_v1_8_3_hotfix_1', array[]::text[], 'authenticated', array['EXECUTE'], 'authenticated users can inspect their own platform administration flag');
select is(
  (
    select provolatile::text
    from pg_proc
    where oid = 'public.is_platform_administrator_v1_8_3_hotfix_1()'::regprocedure
  ),
  'v',
  'platform administrator inspection keeps PostgREST pre-request checks in a read-write transaction'
);
select function_privs_are('private', 'is_platform_administrator', array['uuid'], 'authenticated', array[]::text[], 'the platform administrator helper remains private');
select function_privs_are('public', 'assign_platform_administrator_v1_8_3_hotfix_1', array['uuid'], 'authenticated', array[]::text[], 'clients cannot assign platform administrators');
select function_privs_are('public', 'assign_platform_administrator_v1_8_3_hotfix_1', array['uuid'], 'service_role', array['EXECUTE'], 'only the server role can assign a platform administrator');
select function_privs_are('public', 'delete_organization_v1_8_3_hotfix_1', array['uuid','text'], 'anon', array[]::text[], 'anonymous users cannot delete organizations');
select function_privs_are('public', 'delete_organization_v1_8_3_hotfix_1', array['uuid','text'], 'authenticated', array['EXECUTE'], 'authenticated callers reach the explicitly authorized deletion boundary');
select function_privs_are('public', 'complete_founder_profile_v1_8_3_hotfix_1', array['uuid','text','text','text','text','date'], 'anon', array[]::text[], 'anonymous users cannot create founder profiles');
select function_privs_are('public', 'complete_founder_profile_v1_8_3_hotfix_1', array['uuid','text','text','text','text','date'], 'authenticated', array['EXECUTE'], 'authenticated administrators can complete their founder profile');
select is(
  (select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.delete_organization_v1_8_3_hotfix_1(uuid,text)'::regprocedure),
  true,
  'organization deletion uses an empty search path'
);
select is(
  has_table_privilege('authenticated', 'private.platform_administrators', 'SELECT'),
  false,
  'platform administrator assignments are not directly readable'
);
select is(
  has_table_privilege('authenticated', 'private.organization_deletion_audit', 'SELECT'),
  false,
  'organization deletion audits are not exposed to clients'
);

select * from finish();
rollback;
