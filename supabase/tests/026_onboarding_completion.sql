begin;

select plan(4);

select is(
  has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
  false,
  'authenticated users do not regain table-level profile updates'
);

select is(
  has_column_privilege(
    'authenticated',
    'public.profiles',
    'onboarding_completed_at',
    'UPDATE'
  ),
  true,
  'authenticated users can finish their own onboarding'
);

select is(
  has_column_privilege(
    'anon',
    'public.profiles',
    'onboarding_completed_at',
    'UPDATE'
  ),
  false,
  'anonymous users cannot update onboarding state'
);

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.profiles'::regclass
  ),
  true,
  'profile updates remain protected by RLS'
);

select * from finish();
rollback;
