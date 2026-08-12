begin;
select plan(4);

select has_function(
  'public',
  'apply_directory_sync_batch_v1_8',
  array['uuid','text','jsonb','text','boolean','text','text'],
  'directory batch boundary exists'
);

select function_privs_are(
  'public', 'apply_directory_sync_batch_v1_8',
  array['uuid','text','jsonb','text','boolean','text','text'],
  'authenticated', array[]::text[],
  'authenticated users cannot execute directory batches directly'
);

select function_privs_are(
  'public', 'apply_directory_sync_batch_v1_8',
  array['uuid','text','jsonb','text','boolean','text','text'],
  'anon', array[]::text[],
  'anonymous users cannot execute directory batches'
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
  'v1.8.2 release is seeded once per active workspace'
);

select * from finish();
rollback;
