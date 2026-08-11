begin;
select plan(8);

select has_column('public','workspace_connections','granted_scopes','granted scopes are recorded');
select has_column('public','workspace_connections','account_kind','account kind is recorded');
select has_column('public','workspace_connections','directory_authorized','directory readiness is explicit');
select col_not_null('public','workspace_connections','granted_scopes','granted scopes cannot be null');
select col_not_null('public','workspace_connections','directory_authorized','directory readiness cannot be null');
select function_privs_are(
  'private','save_workspace_connection_v1_8_1',
  array['uuid','uuid','text','text','text[]','text[]','text','boolean','text','text','timestamp with time zone'],
  'anon',array[]::text[],'anonymous users cannot call the private token writer'
);
select function_privs_are(
  'public','save_workspace_connection_v1_8_1',
  array['uuid','uuid','text','text','text[]','text[]','text','boolean','text','text','timestamp with time zone'],
  'anon',array[]::text[],'anonymous users cannot save workspace credentials'
);
select ok(
  not exists(select 1 from public.workspace_connections where account_kind not in ('unknown','consumer','corporate')),
  'all account kinds are valid'
);

select * from finish();
rollback;
