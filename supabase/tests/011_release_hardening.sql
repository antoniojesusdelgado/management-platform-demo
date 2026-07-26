begin;
select plan(8);

select is(
  (
    select count(*)
    from pg_proc function
    join pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'public'
      and function.prosecdef
      and (
        has_function_privilege('anon', function.oid, 'EXECUTE')
        or has_function_privilege('public', function.oid, 'EXECUTE')
      )
  ),
  0::bigint,
  'anonymous and PUBLIC roles cannot execute security definer RPCs'
);

select is(
  (
    select count(*)
    from pg_proc function
    join pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'public'
      and function.prosecdef
      and has_function_privilege('authenticated', function.oid, 'EXECUTE')
      and not (function.proconfig @> array['search_path=""'])
  ),
  0::bigint,
  'authenticated security definer RPCs use an empty search path'
);

select is(
  (
    select count(*)
    from pg_proc function
    join pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'public'
      and function.prosecdef
      and has_function_privilege('authenticated', function.oid, 'EXECUTE')
      and position('auth.uid()' in pg_get_functiondef(function.oid)) = 0
  ),
  0::bigint,
  'authenticated security definer RPCs explicitly inspect the caller identity'
);

select is(
  (
    with foreign_keys as (
      select constraint_row.conrelid, constraint_row.conkey
      from pg_constraint constraint_row
      join pg_class table_row on table_row.oid = constraint_row.conrelid
      join pg_namespace namespace on namespace.oid = table_row.relnamespace
      where constraint_row.contype = 'f'
        and namespace.nspname = 'public'
    )
    select count(*)
    from foreign_keys foreign_key
    where not exists (
      select 1
      from pg_index index_row
      where index_row.indrelid = foreign_key.conrelid
        and index_row.indisvalid
        and (
          index_row.indkey::smallint[]
        )[0:cardinality(foreign_key.conkey) - 1] = foreign_key.conkey
    )
  ),
  0::bigint,
  'every public foreign key has a supporting left-prefix index'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and (
        (
          coalesce(qual, '') ~ '(^|[^a-z_])auth[.]uid[(][)]'
          and coalesce(qual, '') !~ 'SELECT auth[.]uid[(][)] AS uid'
        )
        or (
          coalesce(with_check, '') ~ '(^|[^a-z_])auth[.]uid[(][)]'
          and coalesce(with_check, '')
            !~ 'SELECT auth[.]uid[(][)] AS uid'
        )
      )
  ),
  0::bigint,
  'RLS policies cache auth.uid through an init plan'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and cmd = 'ALL'
      and tablename = any(array[
        'integration_connectors',
        'integration_mappings',
        'module_settings',
        'organization_settings',
        'people',
        'project_members',
        'projects',
        'task_dependencies',
        'tasks',
        'workspace_configuration'
      ])
  ),
  0::bigint,
  'read and mutation policies are separated on managed tables'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and cmd = 'SELECT'
  ),
  1::bigint,
  'projects use one authenticated read policy'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tasks'
      and cmd = 'SELECT'
  ),
  1::bigint,
  'tasks use one authenticated read policy'
);

select * from finish();
rollback;
