-- Optimize authenticated policies so stable session functions are evaluated
-- once per statement instead of once per candidate row.
alter policy "users can read their profile"
on public.profiles
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.memberships viewer
    join public.memberships subject
      on subject.organization_id = viewer.organization_id
    where viewer.profile_id = (select auth.uid())
      and viewer.status = 'active'
      and subject.profile_id = profiles.id
      and subject.status = 'active'
  )
);

alter policy "users can update their profile"
on public.profiles
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

alter policy "members can read leave requests"
on public.leave_requests
using (
  private.has_permission(organization_id, 'vacations.requests.view')
  or profile_id = (select auth.uid())
);

alter policy "members can create their leave requests"
on public.leave_requests
with check (
  profile_id = (select auth.uid())
  and private.has_permission(organization_id, 'vacations.requests.create')
  and status in ('draft', 'submitted')
);

alter policy "members can update their drafts"
on public.leave_requests
using (profile_id = (select auth.uid()) and status = 'draft')
with check (
  profile_id = (select auth.uid())
  and status in ('draft', 'submitted')
);

alter policy "members can read leave history"
on public.leave_request_events
using (
  private.has_permission(organization_id, 'vacations.requests.view')
  or exists (
    select 1
    from public.leave_requests request
    where request.id = leave_request_events.request_id
      and request.profile_id = (select auth.uid())
  )
);

alter policy "managers can create task comments"
on public.task_comments
with check (
  author_profile_id = (select auth.uid())
  and private.has_permission(organization_id, 'tasks.items.manage')
);

alter policy "managers can create incidents"
on public.incidents
with check (
  requester_profile_id = (select auth.uid())
  and private.has_permission(organization_id, 'incidents.tickets.manage')
  and (
    assignee_profile_id is null
    or exists (
      select 1
      from public.memberships membership
      where membership.organization_id = incidents.organization_id
        and membership.profile_id = incidents.assignee_profile_id
        and membership.status = 'active'
    )
  )
);

alter policy "managers can add incident events"
on public.incident_events
with check (
  actor_profile_id = (select auth.uid())
  and private.has_permission(organization_id, 'incidents.tickets.manage')
  and exists (
    select 1
    from public.incidents incident
    where incident.id = incident_events.incident_id
      and incident.organization_id = incident_events.organization_id
  )
);

alter policy "managers can add people events"
on public.people_events
with check (
  actor_profile_id = (select auth.uid())
  and private.has_permission(organization_id, 'people.profiles.manage')
  and exists (
    select 1
    from public.people person
    where person.id = people_events.person_id
      and person.organization_id = people_events.organization_id
  )
);

alter policy "managers can create changelog"
on public.changelog_entries
with check (
  status = 'draft'
  and created_by = (select auth.uid())
  and private.has_permission(organization_id, 'changelog.entries.manage')
);

alter policy "saved_analytics_views_owner"
on public.saved_analytics_views
using (
  profile_id = (select auth.uid())
  and private.has_permission(organization_id, 'analytics.dashboards.view')
)
with check (
  profile_id = (select auth.uid())
  and private.has_permission(organization_id, 'analytics.dashboards.view')
);

-- Keep a single SELECT policy per role and action. The previous ALL policies
-- are split into explicit mutation policies without changing their predicates.
drop policy "integration_connectors_manage"
on public.integration_connectors;
alter policy "integration_connectors_view"
on public.integration_connectors
using (
  private.has_permission(organization_id, 'integrations.runs.view')
  or private.has_permission(organization_id, 'integrations.runs.manage')
);
create policy "integration_connectors_insert"
on public.integration_connectors for insert to authenticated
with check (
  private.has_permission(organization_id, 'integrations.runs.manage')
);
create policy "integration_connectors_update"
on public.integration_connectors for update to authenticated
using (private.has_permission(organization_id, 'integrations.runs.manage'))
with check (
  private.has_permission(organization_id, 'integrations.runs.manage')
);
create policy "integration_connectors_delete"
on public.integration_connectors for delete to authenticated
using (private.has_permission(organization_id, 'integrations.runs.manage'));

drop policy "integration_mappings_manage"
on public.integration_mappings;
alter policy "integration_mappings_view"
on public.integration_mappings
using (
  private.has_permission(organization_id, 'integrations.runs.view')
  or private.has_permission(organization_id, 'integrations.runs.manage')
);
create policy "integration_mappings_insert"
on public.integration_mappings for insert to authenticated
with check (
  private.has_permission(organization_id, 'integrations.runs.manage')
);
create policy "integration_mappings_update"
on public.integration_mappings for update to authenticated
using (private.has_permission(organization_id, 'integrations.runs.manage'))
with check (
  private.has_permission(organization_id, 'integrations.runs.manage')
);
create policy "integration_mappings_delete"
on public.integration_mappings for delete to authenticated
using (private.has_permission(organization_id, 'integrations.runs.manage'));

drop policy "admins can manage module settings"
on public.module_settings;
create policy "admins can insert module settings"
on public.module_settings for insert to authenticated
with check (
  private.has_permission(organization_id, 'settings.workspace.manage')
);
create policy "admins can update module settings"
on public.module_settings for update to authenticated
using (private.has_permission(organization_id, 'settings.workspace.manage'))
with check (
  private.has_permission(organization_id, 'settings.workspace.manage')
);
create policy "admins can delete module settings"
on public.module_settings for delete to authenticated
using (private.has_permission(organization_id, 'settings.workspace.manage'));

drop policy "admins can manage organization settings"
on public.organization_settings;
create policy "admins can insert organization settings"
on public.organization_settings for insert to authenticated
with check (
  private.has_permission(organization_id, 'settings.workspace.manage')
);
create policy "admins can update organization settings"
on public.organization_settings for update to authenticated
using (private.has_permission(organization_id, 'settings.workspace.manage'))
with check (
  private.has_permission(organization_id, 'settings.workspace.manage')
);
create policy "admins can delete organization settings"
on public.organization_settings for delete to authenticated
using (private.has_permission(organization_id, 'settings.workspace.manage'));

drop policy "managers can manage people"
on public.people;
alter policy "authorized members can read people"
on public.people
using (
  private.has_permission(organization_id, 'people.profiles.view')
  or private.has_permission(organization_id, 'people.profiles.manage')
);
create policy "managers can insert people"
on public.people for insert to authenticated
with check (
  private.has_permission(organization_id, 'people.profiles.manage')
  and (
    profile_id is null
    or exists (
      select 1
      from public.memberships membership
      where membership.organization_id = people.organization_id
        and membership.profile_id = people.profile_id
    )
  )
);
create policy "managers can update people"
on public.people for update to authenticated
using (private.has_permission(organization_id, 'people.profiles.manage'))
with check (
  private.has_permission(organization_id, 'people.profiles.manage')
  and (
    profile_id is null
    or exists (
      select 1
      from public.memberships membership
      where membership.organization_id = people.organization_id
        and membership.profile_id = people.profile_id
    )
  )
);
create policy "managers can delete people"
on public.people for delete to authenticated
using (private.has_permission(organization_id, 'people.profiles.manage'));

drop policy "authorized members can manage project members"
on public.project_members;
alter policy "authorized members can read project members"
on public.project_members
using (
  private.has_permission(organization_id, 'projects.items.view')
  or private.has_permission(organization_id, 'projects.items.manage')
);
create policy "authorized members can insert project members"
on public.project_members for insert to authenticated
with check (
  created_by = (select auth.uid())
  and private.has_permission(organization_id, 'projects.items.manage')
);
create policy "authorized members can update project members"
on public.project_members for update to authenticated
using (private.has_permission(organization_id, 'projects.items.manage'))
with check (
  created_by = (select auth.uid())
  and private.has_permission(organization_id, 'projects.items.manage')
);
create policy "authorized members can delete project members"
on public.project_members for delete to authenticated
using (private.has_permission(organization_id, 'projects.items.manage'));

drop policy "authorized members can manage projects"
on public.projects;
alter policy "authorized members can read projects"
on public.projects
using (
  private.has_permission(organization_id, 'projects.items.view')
  or private.has_permission(organization_id, 'projects.items.manage')
);
create policy "authorized members can insert projects"
on public.projects for insert to authenticated
with check (
  created_by = (select auth.uid())
  and private.has_permission(organization_id, 'projects.items.manage')
);
create policy "authorized members can update projects"
on public.projects for update to authenticated
using (private.has_permission(organization_id, 'projects.items.manage'))
with check (
  created_by = (select auth.uid())
  and private.has_permission(organization_id, 'projects.items.manage')
);
create policy "authorized members can delete projects"
on public.projects for delete to authenticated
using (private.has_permission(organization_id, 'projects.items.manage'));

drop policy "managers can manage task dependencies"
on public.task_dependencies;
alter policy "members can read task dependencies"
on public.task_dependencies
using (
  private.has_permission(organization_id, 'tasks.items.view')
  or private.has_permission(organization_id, 'tasks.items.manage')
);
create policy "managers can insert task dependencies"
on public.task_dependencies for insert to authenticated
with check (private.has_permission(organization_id, 'tasks.items.manage'));
create policy "managers can update task dependencies"
on public.task_dependencies for update to authenticated
using (private.has_permission(organization_id, 'tasks.items.manage'))
with check (private.has_permission(organization_id, 'tasks.items.manage'));
create policy "managers can delete task dependencies"
on public.task_dependencies for delete to authenticated
using (private.has_permission(organization_id, 'tasks.items.manage'));

drop policy "managers can manage tasks"
on public.tasks;
alter policy "members can read tasks"
on public.tasks
using (
  private.has_permission(organization_id, 'tasks.items.view')
  or private.has_permission(organization_id, 'tasks.items.manage')
);
create policy "managers can insert tasks"
on public.tasks for insert to authenticated
with check (private.has_permission(organization_id, 'tasks.items.manage'));
create policy "managers can update tasks"
on public.tasks for update to authenticated
using (private.has_permission(organization_id, 'tasks.items.manage'))
with check (private.has_permission(organization_id, 'tasks.items.manage'));
create policy "managers can delete tasks"
on public.tasks for delete to authenticated
using (private.has_permission(organization_id, 'tasks.items.manage'));

drop policy "workspace_configuration_manage"
on public.workspace_configuration;
create policy "workspace_configuration_insert"
on public.workspace_configuration for insert to authenticated
with check (
  private.has_permission(organization_id, 'settings.workspace.manage')
);
create policy "workspace_configuration_update"
on public.workspace_configuration for update to authenticated
using (private.has_permission(organization_id, 'settings.workspace.manage'))
with check (
  private.has_permission(organization_id, 'settings.workspace.manage')
);
create policy "workspace_configuration_delete"
on public.workspace_configuration for delete to authenticated
using (private.has_permission(organization_id, 'settings.workspace.manage'));

-- PostgreSQL does not index foreign-key columns automatically. These indexes
-- support joins, organization-scoped queries and cascading integrity checks.
create index if not exists idx_audit_events_actor_profile_id
  on public.audit_events (actor_profile_id);
create index if not exists idx_changelog_entries_created_by
  on public.changelog_entries (created_by);
create index if not exists idx_changelog_events_actor_profile_id
  on public.changelog_events (actor_profile_id);
create index if not exists idx_changelog_events_entry_id
  on public.changelog_events (entry_id);
create index if not exists idx_data_quality_issues_run_id
  on public.data_quality_issues (run_id);
create index if not exists idx_incident_events_actor_profile_id
  on public.incident_events (actor_profile_id);
create index if not exists idx_incident_events_incident_id
  on public.incident_events (incident_id);
create index if not exists idx_incidents_assignee_person_id
  on public.incidents (assignee_person_id);
create index if not exists idx_incidents_project_id
  on public.incidents (project_id);
create index if not exists idx_incidents_requester_person_id
  on public.incidents (requester_person_id);
create index if not exists idx_incidents_requester_profile_id
  on public.incidents (requester_profile_id);
create index if not exists idx_integration_mappings_organization_id
  on public.integration_mappings (organization_id);
create index if not exists idx_integration_run_items_organization_id
  on public.integration_run_items (organization_id);
create index if not exists idx_integration_runs_created_by
  on public.integration_runs (created_by);
create index if not exists idx_invitations_invited_by
  on public.invitations (invited_by);
create index if not exists idx_invitations_role_id
  on public.invitations (role_id);
create index if not exists idx_leave_policies_organization_id
  on public.leave_policies (organization_id);
create index if not exists idx_leave_request_events_actor_profile_id
  on public.leave_request_events (actor_profile_id);
create index if not exists idx_leave_request_events_request_id
  on public.leave_request_events (request_id);
create index if not exists idx_memberships_role_id
  on public.memberships (role_id);
create index if not exists idx_payroll_events_actor_profile_id
  on public.payroll_events (actor_profile_id);
create index if not exists idx_payroll_events_run_id
  on public.payroll_events (run_id);
create index if not exists idx_payroll_runs_created_by
  on public.payroll_runs (created_by);
create index if not exists idx_people_events_actor_profile_id
  on public.people_events (actor_profile_id);
create index if not exists idx_people_events_person_id
  on public.people_events (person_id);
create index if not exists idx_project_events_actor_profile_id
  on public.project_events (actor_profile_id);
create index if not exists idx_project_events_project_id
  on public.project_events (project_id);
create index if not exists idx_project_members_created_by
  on public.project_members (created_by);
create index if not exists idx_project_members_person_id
  on public.project_members (person_id);
create index if not exists idx_projects_created_by
  on public.projects (created_by);
create index if not exists idx_projects_owner_person_id
  on public.projects (owner_person_id);
create index if not exists idx_role_permissions_permission_id
  on public.role_permissions (permission_id);
create index if not exists idx_saved_analytics_views_profile_id
  on public.saved_analytics_views (profile_id);
create index if not exists idx_task_comments_author_profile_id
  on public.task_comments (author_profile_id);
create index if not exists idx_task_comments_task_id
  on public.task_comments (task_id);
create index if not exists idx_task_dependencies_created_by
  on public.task_dependencies (created_by);
create index if not exists idx_task_dependencies_depends_on_task_id
  on public.task_dependencies (depends_on_task_id);
create index if not exists idx_task_events_actor_profile_id
  on public.task_events (actor_profile_id);
create index if not exists idx_task_events_task_id
  on public.task_events (task_id);
create index if not exists idx_tasks_assignee_person_id
  on public.tasks (assignee_person_id);
create index if not exists idx_tasks_assignee_profile_id
  on public.tasks (assignee_profile_id);
create index if not exists idx_tasks_created_by
  on public.tasks (created_by);
create index if not exists idx_tasks_project_id
  on public.tasks (project_id);
create index if not exists idx_treasury_entries_created_by
  on public.treasury_entries (created_by);
create index if not exists idx_treasury_events_actor_profile_id
  on public.treasury_events (actor_profile_id);
create index if not exists idx_treasury_events_entry_id
  on public.treasury_events (entry_id);
create index if not exists idx_workspace_configuration_updated_by
  on public.workspace_configuration (updated_by);
