begin;
select plan(13);

select has_column(
  'public',
  'profiles',
  'avatar_path',
  'profiles store the private avatar object path'
);
select has_column(
  'public',
  'incidents',
  'affected_service',
  'incidents expose the affected service'
);
select has_column(
  'public',
  'treasury_entries',
  'category',
  'treasury entries expose a synthetic category'
);
select has_column(
  'public',
  'payroll_runs',
  'employer_cost_total_cents',
  'payroll runs expose aggregated employer cost'
);
select has_table(
  'public',
  'payroll_breakdowns',
  'aggregated payroll breakdowns exist'
);
select has_table(
  'public',
  'payroll_checks',
  'aggregated payroll checks exist'
);
select has_table(
  'public',
  'demo_scenario_versions',
  'scenario restore versions are auditable'
);
select is(
  (select public from storage.buckets where id = 'profile-avatars'),
  false,
  'profile avatars are stored in a private bucket'
);
select is(
  (select file_size_limit from storage.buckets where id = 'profile-avatars'),
  1048576::bigint,
  'profile avatars are limited to one megabyte'
);
select is(
  has_function_privilege(
    'anon',
    'public.set_own_avatar_path(text)',
    'EXECUTE'
  ),
  false,
  'anonymous users cannot set an avatar path'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.set_own_avatar_path(text)',
    'EXECUTE'
  ),
  true,
  'authenticated users can set their own avatar path'
);
select is(
  (
    select count(*)
    from public.module_settings
    where module_id = 'centro-control'
  ),
  0::bigint,
  'the legacy analytics module id is removed'
);
select ok(
  not exists (
    select 1
    from public.module_settings
    where module_id not in (
      'inicio', 'analitica', 'vacaciones', 'proyectos', 'tareas',
      'incidencias', 'tesoreria', 'nominas', 'personal', 'novedades',
      'configuracion'
    )
  ),
  'all module settings use supported v1.1 identifiers'
);

select * from finish();
rollback;
