alter table public.module_settings
  drop constraint if exists module_settings_module_id_check;

alter table public.module_settings
  add constraint module_settings_module_id_check check (
    module_id in (
      'inicio',
      'analitica',
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
  ) not valid;

delete from public.module_settings legacy
where legacy.module_id = 'centro-control'
  and exists (
    select 1
    from public.module_settings current_module
    where current_module.organization_id = legacy.organization_id
      and current_module.module_id = 'analitica'
  );

update public.module_settings
set module_id = 'analitica'
where module_id = 'centro-control';

alter table public.module_settings
  validate constraint module_settings_module_id_check;

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
  values (new.id, 'analitica', true, 15)
  on conflict (organization_id, module_id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_control_center_module()
from public, anon, authenticated;

update public.saved_analytics_views
set module_id = 'analitica',
    updated_at = now()
where module_id = 'centro-control';

update public.profiles
set default_dashboard = 'analytics',
    updated_at = now()
where default_dashboard = 'control-center';

alter table public.profiles
  alter column default_dashboard set default 'analytics';

create or replace function public.update_own_profile_preferences(
  target_alias text,
  target_locale text,
  target_timezone text,
  target_theme text,
  target_density text,
  target_reduced_motion boolean,
  target_high_contrast boolean,
  target_default_dashboard text,
  target_notification_preferences jsonb,
  target_simulated_role public.person_role_code
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if not exists (
    select 1
    from public.memberships membership
    where membership.profile_id = auth.uid()
      and membership.status = 'active'
  ) then
    raise exception 'active membership required';
  end if;
  if target_alias is not null
    and trim(target_alias) <> ''
    and char_length(trim(target_alias)) not between 2 and 80
  then
    raise exception 'invalid alias';
  end if;
  if target_locale not in ('es-ES', 'en-GB') then
    raise exception 'invalid locale';
  end if;
  if target_timezone not in (
    'Europe/Madrid', 'Europe/London', 'Atlantic/Canary', 'UTC'
  ) then
    raise exception 'invalid timezone';
  end if;
  if target_theme not in ('light', 'dark', 'system') then
    raise exception 'invalid theme';
  end if;
  if target_density not in ('comfortable', 'compact') then
    raise exception 'invalid density';
  end if;
  if target_default_dashboard not in (
    'analytics', 'projects', 'tasks', 'vacations'
  ) then
    raise exception 'invalid dashboard';
  end if;
  if jsonb_typeof(target_notification_preferences) <> 'object' then
    raise exception 'invalid notification preferences';
  end if;

  update public.profiles
  set alias = nullif(trim(target_alias), ''),
      locale = target_locale,
      timezone = target_timezone,
      theme = target_theme,
      density = target_density,
      reduced_motion = target_reduced_motion,
      high_contrast = target_high_contrast,
      default_dashboard = target_default_dashboard,
      notification_preferences = jsonb_build_object(
        'in_app', coalesce((target_notification_preferences ->> 'in_app')::boolean, true),
        'assignments', coalesce((target_notification_preferences ->> 'assignments')::boolean, true),
        'reviews', coalesce((target_notification_preferences ->> 'reviews')::boolean, true)
      ),
      simulated_role = target_simulated_role,
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.update_own_profile_preferences(
  text, text, text, text, text, boolean, boolean, text, jsonb,
  public.person_role_code
) from public, anon;
grant execute on function public.update_own_profile_preferences(
  text, text, text, text, text, boolean, boolean, text, jsonb,
  public.person_role_code
) to authenticated;

comment on function public.update_own_profile_preferences(
  text, text, text, text, text, boolean, boolean, text, jsonb,
  public.person_role_code
) is 'Updates the authenticated profile through an explicit column allowlist.';
