create or replace function private.ensure_v1_5_1_releases(
  target_organization_id uuid,
  actor_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_organization_id is null or actor_profile_id is null then
    raise exception 'organization and actor are required';
  end if;

  insert into public.changelog_entries (
    id, organization_id, version, title, summary, status,
    published_at, created_by, created_at, updated_at
  )
  select
    private.demo_uuid(target_organization_id, 'changelog-v7-release', release.sequence_number),
    target_organization_id,
    release.version,
    release.title,
    release.summary,
    'published'::public.changelog_status,
    release.published_at,
    actor_profile_id,
    release.published_at,
    release.published_at
  from (
    values
      (4, '1.4.0', 'Un acceso más claro y seguro', 'La pantalla inicial permite elegir con claridad entre recorrer la demo o continuar con Google.', timestamptz '2026-08-03 11:00:00+00'),
      (5, '1.4.1', 'Acceso más fiable desde cualquier dispositivo', 'El inicio con Google y la recuperación de la sesión funcionan mejor dentro y fuera del móvil.', timestamptz '2026-08-03 11:00:00+00'),
      (6, '1.5.0', 'Seguridad reforzada de principio a fin', 'Se han revisado los permisos, las validaciones y los controles que protegen cada publicación.', timestamptz '2026-08-05 11:00:00+00'),
      (7, '1.5.1', 'Novedades siempre al día', 'La versión visible coincide ahora con la publicación disponible y se explica cómo se ha desarrollado el proyecto.', timestamptz '2026-08-07 11:00:00+00'),
      (8, '1.6.0', 'Encuentra y prioriza tu trabajo', 'Una búsqueda global y una bandeja personal reúnen personas, proyectos, tareas, solicitudes e incidencias que requieren atención.', timestamptz '2026-08-10 09:00:00+00')
  ) as release(sequence_number, version, title, summary, published_at)
  on conflict (organization_id, version) do nothing;
end;
$$;

revoke all on function private.ensure_v1_5_1_releases(uuid, uuid)
from public, anon, authenticated;

do $$
declare
  pending record;
begin
  for pending in
    select organization.id as organization_id,
      (select membership.profile_id
       from public.memberships membership
       where membership.organization_id = organization.id
         and membership.status = 'active'
       order by membership.id
       limit 1) as actor_profile_id
    from public.organizations organization
    where organization.scenario_version = 7
  loop
    if pending.actor_profile_id is not null then
      perform private.ensure_v1_5_1_releases(pending.organization_id, pending.actor_profile_id);
    end if;
  end loop;
end;
$$;
