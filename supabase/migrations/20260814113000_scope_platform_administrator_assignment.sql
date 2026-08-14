create or replace function public.assign_platform_administrator_v1_8_3_hotfix_1(
  target_profile_id uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'permission denied';
  end if;

  if not exists (select 1 from public.profiles where id = target_profile_id) then
    raise exception 'profile not found';
  end if;

  insert into private.platform_administrators (profile_id, granted_by)
  values (target_profile_id, current_user)
  on conflict (profile_id) do nothing;
end;
$$;

revoke all on function public.assign_platform_administrator_v1_8_3_hotfix_1(uuid) from public, anon, authenticated;
grant execute on function public.assign_platform_administrator_v1_8_3_hotfix_1(uuid) to service_role;

comment on function public.assign_platform_administrator_v1_8_3_hotfix_1(uuid) is
  'Assigns the platform-level organization lifecycle permission without changing organization memberships or employee roles.';
