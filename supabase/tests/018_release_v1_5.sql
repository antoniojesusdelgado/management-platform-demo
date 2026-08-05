begin;

select plan(3);

select is(
  (
    select count(*)
    from pg_default_acl defaults
    join pg_namespace namespace on namespace.oid = defaults.defaclnamespace
    cross join lateral aclexplode(coalesce(defaults.defaclacl, acldefault('f', defaults.defaclrole))) acl
    where defaults.defaclrole = 'postgres'::regrole
      and defaults.defaclobjtype = 'f'
      and namespace.nspname = 'public'
      and acl.privilege_type = 'EXECUTE'
      and acl.grantee = 0
  ),
  0::bigint,
  'future public functions are not executable by PUBLIC by default'
);

select is(
  (
    select count(*)
    from pg_default_acl defaults
    join pg_namespace namespace on namespace.oid = defaults.defaclnamespace
    cross join lateral aclexplode(coalesce(defaults.defaclacl, acldefault('f', defaults.defaclrole))) acl
    where defaults.defaclrole = 'postgres'::regrole
      and defaults.defaclobjtype = 'f'
      and namespace.nspname = 'public'
      and acl.privilege_type = 'EXECUTE'
      and acl.grantee in ('anon'::regrole, 'authenticated'::regrole)
  ),
  0::bigint,
  'future public functions require an explicit API role grant'
);

select ok(
  has_function_privilege(
    'anon',
    'public.check_management_request_rate_limit()'::regprocedure,
    'EXECUTE'
  ),
  'the reviewed PostgREST pre-request exception remains executable'
);

select * from finish();
rollback;
