revoke all on all tables in schema public from public, anon;

grant select on table
  public.organizations,
  public.profiles,
  public.roles,
  public.permissions,
  public.role_permissions,
  public.memberships,
  public.invitations,
  public.organization_settings,
  public.module_settings,
  public.leave_policies,
  public.leave_requests,
  public.leave_request_events,
  public.tasks,
  public.incidents,
  public.treasury_entries,
  public.payroll_runs,
  public.people,
  public.changelog_entries,
  public.audit_events
to authenticated;

grant update on table public.profiles to authenticated;
grant insert, update on table public.leave_requests to authenticated;

grant insert, update, delete on table
  public.invitations,
  public.organization_settings,
  public.module_settings,
  public.tasks,
  public.incidents
to authenticated;

grant execute on function private.business_days_between(date, date)
to authenticated;
