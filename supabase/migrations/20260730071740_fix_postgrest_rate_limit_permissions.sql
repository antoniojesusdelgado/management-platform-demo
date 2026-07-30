-- Restore Data API access without exposing the pre-request guard as a callable RPC.
create or replace function public.check_management_request_rate_limit()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_method text := current_setting('request.method', true);
  rate_request_path text := coalesce(
    current_setting('request.path', true),
    'unknown'
  );
  request_headers jsonb := coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb,
    '{}'::jsonb
  );
  request_ip text;
  rate_subject_key text;
  request_limit integer := 120;
  request_count integer;
begin
  if trim(leading '/' from rate_request_path)
    = 'rpc/check_management_request_rate_limit'
  then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'rate_limit_guard_not_callable',
        'message', 'La comprobacion previa no es una RPC publica.',
        'details', null,
        'hint', null
      )::text,
      detail = json_build_object(
        'status', 403,
        'status_text', 'Forbidden'
      )::text;
  end if;

  if request_method is null
    or request_method in ('GET', 'HEAD', 'OPTIONS')
  then
    return;
  end if;

  request_ip := coalesce(
    nullif(
      trim(split_part(request_headers ->> 'x-forwarded-for', ',', 1)),
      ''
    ),
    'unknown'
  );
  rate_subject_key := md5(
    coalesce(auth.uid()::text, 'ip:' || request_ip)
  );

  if trim(leading '/' from rate_request_path) in (
    'rpc/restore_demo_scenario',
    'rpc/simulate_integration_run',
    'rpc/ensure_demo_scenario_current'
  ) then
    request_limit := 10;
  end if;

  delete from private.api_rate_limit_events event
  where event.subject_key = rate_subject_key
    and event.requested_at < now() - interval '10 minutes';

  select count(*)
  into request_count
  from private.api_rate_limit_events event
  where event.subject_key = rate_subject_key
    and event.request_path = rate_request_path
    and event.requested_at >= now() - interval '1 minute';

  if request_count >= request_limit then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'rate_limit_exceeded',
        'message', 'Demasiadas solicitudes. Intentalo de nuevo en un minuto.',
        'details', null,
        'hint', null
      )::text,
      detail = json_build_object(
        'status', 429,
        'status_text', 'Too Many Requests',
        'headers', json_build_object('Retry-After', '60')
      )::text;
  end if;

  insert into private.api_rate_limit_events (
    subject_key,
    request_path
  )
  values (
    rate_subject_key,
    left(rate_request_path, 160)
  );
end;
$$;

revoke all on function public.check_management_request_rate_limit()
from public;
grant execute on function public.check_management_request_rate_limit()
to authenticator, anon, authenticated, service_role;

alter role authenticator
  set pgrst.db_pre_request = 'public.check_management_request_rate_limit';
notify pgrst, 'reload config';

comment on function public.check_management_request_rate_limit() is
  'PostgREST pre-request rate-limit guard. Executable by API roles but blocked as a direct RPC.';
