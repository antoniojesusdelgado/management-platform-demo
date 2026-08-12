-- v1.8.2 keeps identity sign-in separate from optional productivity and
-- directory grants. Directory batches are applied only by trusted server code.

revoke all on function public.apply_directory_sync_batch_v1_8(
  uuid, text, jsonb, text, boolean, text, text
) from public, anon, authenticated;
grant execute on function public.apply_directory_sync_batch_v1_8(
  uuid, text, jsonb, text, boolean, text, text
) to service_role;

do $$
declare
  target_organization_id uuid;
  release_id uuid;
begin
  for target_organization_id in select id from public.organizations
  loop
    release_id := extensions.uuid_generate_v5(
      target_organization_id,
      'changelog:v1.8.2'
    );

    insert into public.changelog_entries (
      id, organization_id, version, title, summary, status, published_at,
      created_by, created_at, updated_at
    )
    select
      release_id,
      target_organization_id,
      '1.8.2',
      'Acceso más claro y seguro',
      'Mejoramos el inicio de sesión, el rendimiento y la protección de la plataforma. Google y Microsoft ahora solicitan solo los permisos necesarios para cada acción.',
      'published',
      '2026-08-12 10:00:00+02'::timestamptz,
      member.profile_id,
      now(),
      now()
    from public.memberships member
    where member.organization_id = target_organization_id
      and member.status = 'active'
    order by member.created_at
    limit 1
    on conflict (id) do nothing;
  end loop;
end;
$$;

comment on function public.apply_directory_sync_batch_v1_8(
  uuid, text, jsonb, text, boolean, text, text
) is 'Server-only directory synchronization boundary. Callable exclusively with service_role.';
