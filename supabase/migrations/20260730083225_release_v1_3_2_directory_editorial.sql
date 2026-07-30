-- Align authenticated Scenario V7 directory names with the guest catalog.
create or replace function private.scenario_v7_person_name(
  sequence_number integer
)
returns text
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  first_names constant text[] := array[
    'Lucía', 'Álvaro', 'Carmen', 'Hugo', 'Sofía', 'Daniel', 'Elena',
    'Marcos', 'Irene', 'Pablo', 'Nora', 'Adrián', 'Claudia', 'Mateo',
    'Julia', 'Leo', 'Valeria', 'Bruno', 'Aitana', 'Sergio', 'Marta',
    'Nicolás', 'Emma', 'Álex', 'Vega', 'Rubén', 'Lara', 'Samuel',
    'Olivia', 'Gonzalo', 'Inés', 'Mario'
  ];
  surnames constant text[] := array[
    'Martín', 'Romero', 'Vidal', 'Navarro', 'Campos', 'Ortega', 'Costa',
    'León', 'Salas', 'Ríos', 'Ferrer', 'Vega', 'Serra', 'Lozano',
    'Pastor', 'Cabrera', 'Prieto', 'Molina', 'Rey', 'Peña', 'Soler',
    'Blanco', 'Galán', 'Fuentes', 'Santamaría', 'Pardo', 'Moya', 'Cano',
    'Núñez', 'Iglesias', 'Pascual', 'Arias'
  ];
  zero_based integer := sequence_number - 1;
  first_name_index integer;
  surname_index integer;
begin
  if sequence_number < 1 or sequence_number > 266 then
    raise exception 'scenario V7 person sequence must be between 1 and 266';
  end if;

  first_name_index := mod(zero_based, 32) + 1;
  surname_index := case
    when sequence_number <= 32 then first_name_index
    else mod(zero_based + (zero_based / 32) * 7, 32) + 1
  end;

  return first_names[first_name_index] || ' ' || surnames[surname_index];
end;
$$;

revoke all on function private.scenario_v7_person_name(integer)
from public, anon, authenticated;

create or replace function private.apply_scenario_v7_person_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate integer;
begin
  if new.display_name not like 'Persona sint%' then
    return new;
  end if;

  for candidate in 1..266 loop
    if new.id = private.demo_uuid(
      new.organization_id,
      'person-v7',
      candidate
    ) then
      new.display_name := private.scenario_v7_person_name(candidate);
      exit;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.apply_scenario_v7_person_name()
from public, anon, authenticated;

drop trigger if exists scenario_v7_person_name_before_insert
on public.people;

create trigger scenario_v7_person_name_before_insert
before insert on public.people
for each row
execute function private.apply_scenario_v7_person_name();

update public.people person
set display_name = private.scenario_v7_person_name(candidate.item)
from generate_series(1, 266) candidate(item)
where person.id = private.demo_uuid(
    person.organization_id,
    'person-v7',
    candidate.item
  )
  and person.display_name like 'Persona sint%';

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
  on conflict (organization_id, version) do update
  set title = excluded.title,
      summary = excluded.summary,
      status = excluded.status,
      published_at = excluded.published_at,
      updated_at = excluded.updated_at;

  with editorial_copy(version, title, summary) as (
    values
      ('0.1.0', 'Todo el trabajo, en un solo lugar', 'Una base común para consultar los módulos y acceder a cada función según el perfil.'),
      ('0.2.0', 'Vacaciones más fáciles de gestionar', 'Solicitudes, aprobaciones y calendario de ausencias reunidos en un mismo espacio.'),
      ('0.3.0', 'Proyectos y tareas bajo control', 'Seguimiento claro de responsables, fechas, dependencias y trabajo pendiente.'),
      ('0.4.0', 'Mejor atención y visión del equipo', 'Incidencias y directorio de personal conectados para facilitar la coordinación diaria.'),
      ('0.5.0', 'Finanzas y nóminas más claras', 'Movimientos revisados y ciclos de nómina resumidos para una consulta más sencilla.'),
      ('0.6.0', 'Procesos conectados y menos trabajo manual', 'Importaciones programadas y controles que ayudan a mantener la información al día.'),
      ('0.7.0', 'Información histórica lista para consultar', 'La actividad anterior queda organizada y validada para poder revisarla con confianza.'),
      ('1.0.0', 'Una plataforma preparada para el día a día', 'Acceso seguro con Google y espacios separados para cada organización.'),
      ('1.1.0', 'Más claridad para decidir', 'Nuevos indicadores, filtros y mejoras de accesibilidad para trabajar con mayor comodidad.'),
      ('1.2.0', 'Una visión más completa de la actividad', 'Datos mejor equilibrados y comparaciones más útiles para entender la evolución del trabajo.'),
      ('1.2.1', 'Una experiencia más cuidada', 'Mejoras en el acceso, los gráficos, los proyectos y la navegación desde distintos dispositivos.'),
      ('1.2.2', 'Mejoras en toda la plataforma', 'Una experiencia más fluida en analítica, trabajo móvil, nóminas y equipos.'),
      ('1.3.0', 'Elige cómo quieres trabajar', 'Tema claro por defecto, modo oscuro opcional y una visión de la actividad siempre actualizada.'),
      ('1.3.1', 'Más cómoda en móvil y más segura', 'Las tareas se consultan mejor desde el teléfono y la protección de los datos se ha reforzado.'),
      ('1.3.2', 'Un directorio más cercano y claro', 'Todos los perfiles muestran nombres completos y las novedades son ahora más fáciles de entender.')
  )
  update public.changelog_entries entry
  set title = editorial_copy.title,
      summary = editorial_copy.summary
  from editorial_copy
  where entry.organization_id = target_organization_id
    and entry.version = editorial_copy.version
    and entry.status = 'published'::public.changelog_status;
end;
$$;

revoke all on function private.ensure_v1_3_2_release(uuid, uuid)
from public, anon, authenticated;

create or replace function private.ensure_v1_3_1_release(
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
    private.demo_uuid(target_organization_id, 'changelog-v7-release', 2),
    target_organization_id,
    '1.3.1',
    'Más cómoda en móvil y más segura',
    'Las tareas se consultan mejor desde el teléfono y la protección de los datos se ha reforzado.',
    'published'::public.changelog_status,
    timestamptz '2026-07-29 10:00:00+00',
    actor_profile_id,
    timestamptz '2026-07-29 10:00:00+00',
    timestamptz '2026-07-29 10:00:00+00'
  )
  on conflict (organization_id, version) do update
  set title = excluded.title,
      summary = excluded.summary,
      status = excluded.status,
      published_at = excluded.published_at,
      updated_at = excluded.updated_at;

  perform private.ensure_v1_3_2_release(
    target_organization_id,
    actor_profile_id
  );
end;
$$;

revoke all on function private.ensure_v1_3_1_release(uuid, uuid)
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
      perform private.ensure_v1_3_2_release(
        pending.organization_id,
        pending.actor_profile_id
      );
    end if;
  end loop;
end;
$$;
