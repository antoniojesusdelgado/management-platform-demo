alter table public.module_settings
  drop constraint if exists module_settings_module_id_check;
alter table public.module_settings
  add constraint module_settings_module_id_check check (
    module_id in (
      'inicio',
      'centro-control',
      'vacaciones',
      'proyectos',
      'tareas',
      'incidencias',
      'tesoreria',
      'nominas',
      'personal',
      'novedades',
      'configuracion'
    )
  );

insert into public.module_settings (
  organization_id,
  module_id,
  enabled,
  sort_order
)
select organization.id, 'centro-control', true, 15
from public.organizations organization
on conflict (organization_id, module_id) do update
set enabled = true;

update public.module_settings
set sort_order = sort_order + 10
where module_id not in ('inicio', 'centro-control')
  and sort_order < 1000;
