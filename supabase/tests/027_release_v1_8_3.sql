begin;

select plan(2);

select is(
  (select count(*)::integer from public.changelog_entries where version = '1.8.3'),
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
  'v1.8.3 is published once per active organization'
);

select is(
  (
    select count(*)::integer
    from public.changelog_entries
    where version = '1.8.3'
      and title = 'Una experiencia más ágil y fácil de entender'
      and summary = 'Los cambios de sección son más fluidos, Microsoft se reconoce mejor y hemos simplificado los textos para que cada opción resulte clara.'
  ),
  (select count(*)::integer from public.changelog_entries where version = '1.8.3'),
  'v1.8.3 uses the canonical user-facing copy'
);

select * from finish();
rollback;
