revoke update on table public.profiles from authenticated;

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
    'Europe/Madrid',
    'Europe/London',
    'Atlantic/Canary',
    'UTC'
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
    'control-center',
    'projects',
    'tasks',
    'vacations'
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
        'in_app',
        coalesce(
          (target_notification_preferences ->> 'in_app')::boolean,
          true
        ),
        'assignments',
        coalesce(
          (target_notification_preferences ->> 'assignments')::boolean,
          true
        ),
        'reviews',
        coalesce(
          (target_notification_preferences ->> 'reviews')::boolean,
          true
        )
      ),
      simulated_role = target_simulated_role,
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.update_own_profile_preferences(
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  text,
  jsonb,
  public.person_role_code
) from public, anon;

grant execute on function public.update_own_profile_preferences(
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  text,
  jsonb,
  public.person_role_code
) to authenticated;
