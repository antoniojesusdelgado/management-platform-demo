create or replace function public.transition_leave_request(
  target_request_id uuid,
  target_status public.leave_request_status,
  transition_note text,
  expected_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_request public.leave_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select *
  into current_request
  from public.leave_requests
  where id = target_request_id
    and organization_id = expected_organization_id
  for update;

  if not found then
    raise exception 'leave request not found';
  end if;

  if current_request.status = 'draft'
    and target_status in ('submitted', 'cancelled') then
    if current_request.profile_id <> auth.uid()
      or not private.has_permission(
        expected_organization_id,
        'vacations.requests.create'
      ) then
      raise exception 'permission denied';
    end if;
  elsif not private.has_permission(
    expected_organization_id,
    'vacations.requests.approve'
  ) then
    raise exception 'permission denied';
  end if;

  if not (
    (current_request.status = 'draft' and target_status in ('submitted', 'cancelled'))
    or (current_request.status = 'submitted' and target_status in ('approved', 'rejected', 'cancelled'))
    or (current_request.status = 'approved' and target_status = 'cancelled')
  ) then
    raise exception 'invalid leave request transition';
  end if;

  if char_length(trim(transition_note)) not between 3 and 300 then
    raise exception 'invalid transition note';
  end if;

  update public.leave_requests
  set status = target_status,
      updated_at = now()
  where id = current_request.id;

  insert into public.leave_request_events (
    organization_id,
    request_id,
    actor_profile_id,
    from_status,
    to_status,
    note
  )
  values (
    current_request.organization_id,
    current_request.id,
    auth.uid(),
    current_request.status,
    target_status,
    trim(transition_note)
  );

  insert into public.audit_events (
    organization_id,
    actor_profile_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    current_request.organization_id,
    auth.uid(),
    'leave_request.transitioned',
    'leave_request',
    current_request.id,
    jsonb_build_object(
      'from', current_request.status,
      'to', target_status
    )
  );
end;
$$;

revoke all on function public.transition_leave_request(
  uuid,
  public.leave_request_status,
  text,
  uuid
) from public, anon;

grant execute on function public.transition_leave_request(
  uuid,
  public.leave_request_status,
  text,
  uuid
) to authenticated;
