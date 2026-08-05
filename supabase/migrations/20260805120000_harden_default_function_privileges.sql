-- New public functions must be explicitly reviewed before PostgREST can expose them.
-- Existing grants are preserved; this only changes defaults for future objects.
alter default privileges for role postgres in schema public
  revoke execute on functions from public;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
