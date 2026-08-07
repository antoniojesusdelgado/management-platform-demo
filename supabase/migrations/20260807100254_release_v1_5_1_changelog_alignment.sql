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
    id,
    organization_id,
    version,
    title,
    summary,
    status,
    published_at,
    created_by,
    created_at,
    updated_at
  )
  select
    private.demo_uuid(
      target_organization_id,
      'changelog-v7-release',
      release.sequence_number
    ),
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
      (
        4,
        '1.4.0',
        'Un acceso más claro y seguro',
        'La pantalla inicial permite elegir con claridad entre recorrer la demo o continuar con Google.',
        timestamptz '2026-08-03 11:00:00+00'
      ),
      (
        5,
        '1.4.1',
        'Acceso más fiable desde cualquier dispositivo',
        'El inicio con Google y la recuperación de la sesión funcionan mejor dentro y fuera del móvil.',
        timestamptz '2026-08-03 11:00:00+00'
      ),
      (
        6,
        '1.5.0',
        'Seguridad reforzada de principio a fin',
        'Se han revisado los permisos, las validaciones y los controles que protegen cada publicación.',
        timestamptz '2026-08-05 11:00:00+00'
      ),
      (
        7,
        '1.5.1',
        'Novedades siempre al día',
        'La versión visible coincide ahora con la publicación disponible y se explica cómo se ha desarrollado el proyecto.',
        timestamptz '2026-08-07 11:00:00+00'
      )
  ) as release(
    sequence_number,
    version,
    title,
    summary,
    published_at
  )
  on conflict (organization_id, version) do nothing;
end;
$$;

revoke all on function private.ensure_v1_5_1_releases(uuid, uuid)
from public, anon, authenticated;

create or replace function private.ensure_v1_3_2_release(
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
  values (
    private.demo_uuid(target_organization_id, 'changelog-v7-release', 3),
    target_organization_id,
    '1.3.2',
    'Un directorio más cercano y claro',
    'Todos los perfiles muestran nombres completos y las novedades son ahora más fáciles de entender.',
    'published'::public.changelog_status,
    timestamptz '2026-07-30 10:00:00+00',
    actor_profile_id,
    timestamptz '2026-07-30 10:00:00+00',
    timestamptz '2026-07-30 10:00:00+00'
  )
  on conflict (organization_id, version) do nothing;

  with editorial_copy(
    version,
    original_title,
    original_summary,
    natural_title,
    natural_summary
  ) as (
    values
      (
        '0.7.0',
        'Migración de datos',
        'Carga histórica, validaciones de calidad y restauración controlada del escenario.',
        'Información histórica lista para consultar',
        'La actividad anterior queda organizada y validada para poder revisarla con confianza.'
      ),
      (
        '1.2.0',
        'Datos equilibrados y análisis dinámico',
        'Escenario operativo revisado, filtros comparables y presentación más consistente.',
        'Una visión más completa de la actividad',
        'Datos mejor equilibrados y comparaciones más útiles para entender la evolución del trabajo.'
      ),
      (
        '1.2.1',
        'Ajustes finales de presentación',
        'Acceso, gráficos, proyectos, datos y comportamiento responsive revisados.',
        'Una experiencia más cuidada',
        'Mejoras en el acceso, los gráficos, los proyectos y la navegación desde distintos dispositivos.'
      ),
      (
        '1.3.0',
        'Tema y experiencia responsive',
        'Tema claro por defecto y oscuro manual, analítica estable y Scenario V7 incremental.',
        'Elige cómo quieres trabajar',
        'Tema claro por defecto, modo oscuro opcional y una visión de la actividad siempre actualizada.'
      ),
      (
        '1.3.1',
        'Corrección responsive y seguridad',
        'Tareas móviles, backfill aditivo y controles de seguridad reforzados.',
        'Más cómoda en móvil y más segura',
        'Las tareas se consultan mejor desde el teléfono y la protección de los datos se ha reforzado.'
      )
  )
  update public.changelog_entries entry
  set title = editorial_copy.natural_title,
      summary = editorial_copy.natural_summary
  from editorial_copy
  where entry.organization_id = target_organization_id
    and entry.version = editorial_copy.version
    and entry.title = editorial_copy.original_title
    and entry.summary = editorial_copy.original_summary;

  perform private.ensure_v1_5_1_releases(
    target_organization_id,
    actor_profile_id
  );
end;
$$;

revoke all on function private.ensure_v1_3_2_release(uuid, uuid)
from public, anon, authenticated;

do $$
declare
  pending record;
begin
  for pending in
    select
      organization.id as organization_id,
      (
        select membership.profile_id
        from public.memberships membership
        where membership.organization_id = organization.id
          and membership.status = 'active'
        order by membership.id
        limit 1
      ) as actor_profile_id
    from public.organizations organization
    where organization.scenario_version = 7
  loop
    if pending.actor_profile_id is not null then
      perform private.ensure_v1_5_1_releases(
        pending.organization_id,
        pending.actor_profile_id
      );
    end if;
  end loop;
end;
$$;
