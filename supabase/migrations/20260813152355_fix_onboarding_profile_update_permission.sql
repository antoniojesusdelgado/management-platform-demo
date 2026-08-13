-- The onboarding RPC runs with invoker rights and updates only this field.
-- Keep the table-level UPDATE privilege revoked and expose the minimum column.
grant update (onboarding_completed_at)
on table public.profiles
to authenticated;
