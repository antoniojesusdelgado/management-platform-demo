create or replace function private.handle_control_center_module()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.module_settings (
    organization_id,
    module_id,
    enabled,
    sort_order
  )
  values (new.id, 'centro-control', true, 15)
  on conflict (organization_id, module_id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_control_center_module()
from public, anon, authenticated;

create trigger on_organization_create_control_center
after insert on public.organizations
for each row execute function private.handle_control_center_module();
