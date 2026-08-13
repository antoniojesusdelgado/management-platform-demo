begin;

select plan(9);

select has_table(
  'public',
  'data_erasure_requests',
  'minimal erasure evidence table exists'
);

select is(
  (select relrowsecurity from pg_class where oid = 'public.data_erasure_requests'::regclass),
  true,
  'erasure evidence uses RLS'
);

select is(
  has_table_privilege('authenticated', 'public.data_erasure_requests', 'SELECT'),
  false,
  'authenticated clients cannot enumerate erasure evidence'
);

select function_privs_are(
  'public',
  'prepare_own_account_erasure_v1_8_2',
  array[]::text[],
  'anon',
  array[]::text[],
  'anonymous clients cannot prepare account erasure'
);

select function_privs_are(
  'public',
  'prepare_own_account_erasure_v1_8_2',
  array[]::text[],
  'authenticated',
  array['EXECUTE'],
  'an authenticated person can erase only their own account'
);

select is(
  (
    select p.proconfig @> array['search_path=""']
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'prepare_own_account_erasure_v1_8_2'
  ),
  true,
  'the erasure function uses an empty search path'
);

select is(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'prepare_own_account_erasure_v1_8_2'
  ),
  false,
  'the exposed wrapper uses invoker rights'
);

select is(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'prepare_own_account_erasure_v1_8_2'
  ),
  true,
  'the privileged implementation remains in the private schema'
);

select is(
  (select count(*)::integer from public.changelog_entries where version = '1.8.2'),
  (
    select count(*)::integer
    from public.organizations organization
    where exists (
      select 1
      from public.memberships membership
      where membership.organization_id = organization.id
        and membership.status = 'active'
    )
  ),
  'the privacy copy preserves one v1.8.2 entry per active workspace'
);

select * from finish();
rollback;
