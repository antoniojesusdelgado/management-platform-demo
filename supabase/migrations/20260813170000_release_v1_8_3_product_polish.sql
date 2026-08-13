-- Publish v1.8.3 once per active organization without changing user-edited entries.
do $$
declare
  target_organization_id uuid;
  release_id uuid;
begin
  for target_organization_id in select id from public.organizations
  loop
    release_id := extensions.uuid_generate_v5(target_organization_id, 'changelog:v1.8.3');

    insert into public.changelog_entries (
      id, organization_id, version, title, summary, status, published_at,
      created_by, created_at, updated_at
    )
    select
      release_id,
      target_organization_id,
      '1.8.3',
      'Una experiencia más ágil y fácil de entender',
      'Los cambios de sección son más fluidos, Microsoft se reconoce mejor y hemos simplificado los textos para que cada opción resulte clara.',
      'published',
      '2026-08-13 17:00:00+02'::timestamptz,
      membership.profile_id,
      now(),
      now()
    from public.memberships membership
    where membership.organization_id = target_organization_id
      and membership.status = 'active'
    order by membership.created_at
    limit 1
    on conflict (id) do nothing;
  end loop;
end;
$$;
