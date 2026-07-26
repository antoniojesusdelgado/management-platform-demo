-- This seed contains synthetic data only.
-- It intentionally does not create auth users. After local auth users exist,
-- add organization memberships using their generated UUIDs.

insert into public.organizations (id, name, slug)
values (
  '10000000-0000-4000-8000-000000000001',
  'Organización demo',
  'organizacion-demo'
)
on conflict (id) do nothing;

insert into public.organization_settings (organization_id)
values ('10000000-0000-4000-8000-000000000001')
on conflict (organization_id) do nothing;

insert into public.module_settings (organization_id, module_id, sort_order)
select
  '10000000-0000-4000-8000-000000000001',
  module_id,
  sort_order
from (
  values
    ('inicio', 0),
    ('vacaciones', 1),
    ('tareas', 2),
    ('incidencias', 3),
    ('tesoreria', 4),
    ('nominas', 5),
    ('personal', 6),
    ('novedades', 7),
    ('configuracion', 8)
) as modules(module_id, sort_order)
on conflict (organization_id, module_id) do nothing;
