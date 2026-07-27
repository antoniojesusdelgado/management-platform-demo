alter table public.profiles
  add column avatar_path text;

alter table public.profiles
  add constraint profiles_avatar_path_format check (
    avatar_path is null
    or avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-avatars',
  'profile-avatars',
  false,
  1048576,
  array['image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy profile_avatars_owner_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy profile_avatars_owner_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.extension(name)) = 'webp'
);

create policy profile_avatars_owner_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.extension(name)) = 'webp'
);

create policy profile_avatars_owner_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.set_own_avatar_path(target_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if target_path is not null and (
    target_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
    or split_part(target_path, '/', 1) <> auth.uid()::text
  ) then
    raise exception 'invalid avatar path';
  end if;

  update public.profiles
  set avatar_path = target_path,
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.set_own_avatar_path(text) from public, anon;
grant execute on function public.set_own_avatar_path(text) to authenticated;

create or replace function public.clear_own_avatar_path()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  update public.profiles
  set avatar_path = null,
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.clear_own_avatar_path() from public, anon;
grant execute on function public.clear_own_avatar_path() to authenticated;

comment on column public.profiles.avatar_path is
  'Private Storage object path owned by the authenticated profile.';
