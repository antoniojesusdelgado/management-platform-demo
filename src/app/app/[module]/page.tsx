import { IconLock, IconSettings } from "@tabler/icons-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthenticatedApp } from "@/components/authenticated-app";
import { isModuleId } from "@/domain/modules";
import type { Incident, IncidentEvent } from "@/domain/incidents";
import type { Person, PersonEvent } from "@/domain/people";
import type { Project, ProjectEvent } from "@/domain/projects";
import type { ChangelogEntry, ChangelogEvent } from "@/domain/changelog";
import type { TreasuryCurrency, TreasuryEntry, TreasuryEvent } from "@/domain/treasury";
import type { PayrollCurrency, PayrollEvent, PayrollParticipant, PayrollRun } from "@/domain/payroll";
import type { DataQualityIssue, IntegrationConnector, IntegrationRun, SavedAnalyticsView } from "@/domain/integrations";
import type { PermissionCode } from "@/domain/permissions";
import { createDefaultModuleSettings, type AdminAuditEvent, type ConfigurableRole, type ModuleSetting, type WorkspaceInvitation, type WorkspaceMembership } from "@/domain/settings";
import type { LeaveRequest, LeaveRequestEvent } from "@/domain/vacations";
import type {
  TaskComment,
  TaskDependency,
  TaskEvent,
  TaskItem,
} from "@/domain/tasks";
import { getWorkspaceAccess } from "@/lib/auth";
import { hasWorkspacePermission } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";
import {
  defaultWorkspaceConfiguration,
  parseWorkspaceConfiguration,
  type WorkspaceConfiguration,
} from "@/domain/workspace-configuration";
import type { AnalyticsServiceDimension } from "@/domain/analytics";
import {
  automationRuleSchema,
  automationRunSchema,
  capacityAllocationSchema,
  createDefaultOperationsState,
  exportJobSchema,
  operationalNotificationSchema,
  projectTemplateSchema,
  recurrenceRuleSchema,
  workspaceConnectionSchema,
  type AutomationRule,
  type AutomationRun,
  type CapacityAllocation,
  type ExportJob,
  type OperationalNotification,
  type ProjectTemplate,
  type RecurrenceRule,
  type WorkspaceConnection,
} from "@/domain/operations";

export default async function AppModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<{ focus?: string | string[] }>;
}) {
  const { module } = await params;
  const requestedFocus = (await searchParams).focus;
  const focusedEntityId = typeof requestedFocus === "string" && /^[a-z0-9-]{1,160}$/i.test(requestedFocus)
    ? requestedFocus
    : null;
  if (!isModuleId(module)) notFound();

  const access = await getWorkspaceAccess();
  if (access.status === "signed-out") redirect("/login");

  if (access.status === "not-configured") {
    return (
      <main className="landing">
        <section className="landing-card">
          <div>
            <p className="eyebrow" style={{ color: "#93c5fd" }}>
              Integración preparada
            </p>
            <h1>Supabase pendiente de provisión</h1>
            <p>
              La aplicación autenticada se activará cuando se autorice el coste
              del proyecto independiente y se configuren las variables.
            </p>
            <Link className="button button-primary" href="/demo/embed">
              Entrar sin cuenta
            </Link>
          </div>
          <aside className="demo-note">
            <IconSettings aria-hidden="true" size={31} />
            <h2 style={{ marginTop: "1rem" }}>Sin conexión simulada</h2>
            <p>
              Este estado no finge autenticación ni escritura en base de datos.
            </p>
          </aside>
        </section>
      </main>
    );
  }

  if (access.status === "not-invited") {
    return (
      <main className="landing">
        <section className="landing-card">
          <div>
            <p className="eyebrow" style={{ color: "#93c5fd" }}>
              Espacio personal no disponible
            </p>
            <h1>No se pudo preparar tu espacio personal</h1>
            <p>
              La identidad se ha verificado, pero el aprovisionamiento
              automático no se completó. Cierra sesión y vuelve a intentarlo.
            </p>
          </div>
          <aside className="demo-note">
            <IconLock aria-hidden="true" size={31} />
            <h2 style={{ marginTop: "1rem" }}>Error recuperable</h2>
          </aside>
        </section>
      </main>
    );
  }

  const profileClient = await createClient();
  const { error: scenarioError } = await profileClient.rpc(
    "ensure_demo_scenario_current",
    { expected_organization_id: access.organizationId },
  );
  const { data: currentProfile, error: profileError } = await profileClient
    .from("profiles")
    .select(
      "display_name,alias,avatar_path,theme,density,reduced_motion,high_contrast",
    )
    .eq("id", access.userId)
    .single();
  const { data: currentOrganization, error: organizationError } = await profileClient
    .from("organizations")
    .select("scenario_anchor_date,scenario_generated_through_date")
    .eq("id", access.organizationId)
    .single();
  const signedAvatar = currentProfile?.avatar_path
    ? await profileClient.storage
        .from("profile-avatars")
        .createSignedUrl(currentProfile.avatar_path, 3600)
    : null;

  let leaveRequests: LeaveRequest[] = [];
  let leaveEvents: LeaveRequestEvent[] = [];
  let leaveLoadError: string | undefined;
  let tasks: TaskItem[] = [];
  let taskDependencies: TaskDependency[] = [];
  let taskComments: TaskComment[] = [];
  let taskEvents: TaskEvent[] = [];
  let taskAssignees: string[] = [];
  let taskMentionOptions: Array<{ id: string; label: string }> = [];
  let currentUserName: string | undefined;
  let taskLoadError: string | undefined;
  let incidents: Incident[] = [];
  let incidentEvents: IncidentEvent[] = [];
  let incidentAssignees: string[] = [];
  let incidentLoadError: string | undefined;
  let people: Person[] = [];
  let peopleEvents: PersonEvent[] = [];
  let peopleLoadError: string | undefined;
  let projects: Project[] = [];
  let projectEvents: ProjectEvent[] = [];
  let projectsLoadError: string | undefined;
  let canManageProjects = false;
  let changelogEntries: ChangelogEntry[] = [];
  let changelogEvents: ChangelogEvent[] = [];
  let changelogLoadError: string | undefined;
  let canManageChangelog = false;
  let treasuryEntries: TreasuryEntry[] = [];
  let treasuryEvents: TreasuryEvent[] = [];
  let treasuryLoadError: string | undefined;
  let canManageTreasury = false;
  let payrollRuns: PayrollRun[] = [];
  let payrollParticipants: PayrollParticipant[] = [];
  let payrollEvents: PayrollEvent[] = [];
  let payrollLoadError: string | undefined;
  let canManagePayroll = false;
  let integrationConnectors: IntegrationConnector[] = [];
  let integrationRuns: IntegrationRun[] = [];
  let dataQualityIssues: DataQualityIssue[] = [];
  let canManageIntegrations = false;
  let savedAnalyticsViews: SavedAnalyticsView[] = [];
  let analyticsServiceDimensions: AnalyticsServiceDimension[] = [];
  let moduleSettings: ModuleSetting[] = [];
  let roles: ConfigurableRole[] = [];
  let memberships: WorkspaceMembership[] = [];
  let invitations: WorkspaceInvitation[] = [];
  let adminAuditEvents: AdminAuditEvent[] = [];
  let settingsLoadError: string | undefined;
  let canManageSettings = false;
  let workspaceConnections: WorkspaceConnection[] = createDefaultOperationsState().workspaceConnections.map((connection) => ({ ...connection, status: "revoked", accountLabel: "Sin conexión" }));
  let automationRules: AutomationRule[] = [];
  let automationRuns: AutomationRun[] = [];
  let projectTemplates: ProjectTemplate[] = [];
  let recurrenceRules: RecurrenceRule[] = [];
  let capacityAllocations: CapacityAllocation[] = [];
  let operationalNotifications: OperationalNotification[] = [];
  let exportJobs: ExportJob[] = [];
  let operationsLoadError: string | undefined;
  let canManageOperations = false;
  let workspaceConfiguration: WorkspaceConfiguration =
    defaultWorkspaceConfiguration;

  if (
    module === "vacaciones" ||
    module === "personal"
  ) {
    const supabase = await createClient();
    const [requestsResult, eventsResult] = await Promise.all([
      supabase
        .from("leave_requests")
        .select(
          "id,start_date,end_date,business_days,leave_type,reason,status,created_at,updated_at,person:people!leave_requests_person_id_fkey(display_name)",
        )
        .eq("organization_id", access.organizationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("leave_request_events")
        .select(
          "id,request_id,from_status,to_status,note,created_at,profiles!actor_profile_id(display_name)",
        )
        .eq("organization_id", access.organizationId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    const requests = requestsResult.data;
    const events = eventsResult.data;
    if (requestsResult.error || eventsResult.error) {
      leaveLoadError =
        "Vuelve a intentarlo. Si el problema continúa, revisa la conexión local.";
    }

    leaveRequests = (requests ?? []).map((request) => ({
      id: request.id,
      employeeName: (
        request.person as unknown as { display_name: string }
      ).display_name,
      startDate: request.start_date,
      endDate: request.end_date,
      businessDays: request.business_days,
      type: request.leave_type,
      reason: request.reason,
      status: request.status,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
    })) as LeaveRequest[];

    leaveEvents = (events ?? []).map((event) => ({
      id: event.id,
      requestId: event.request_id,
      from: event.from_status,
      to: event.to_status,
      note: event.note,
      actorName:
        (
          event.profiles as unknown as { display_name: string } | null
        )?.display_name ?? "Sistema",
      createdAt: event.created_at,
    })) as LeaveRequestEvent[];
  }

  if (module === "analitica") {
    const supabase = await createClient();
    const [viewsResult, dimensionsResult] = await Promise.all([
      supabase
        .from("saved_analytics_views")
        .select("id,name,module_id,filters")
        .eq("organization_id", access.organizationId)
        .eq("profile_id", access.userId)
        .eq("module_id", "analitica")
        .order("updated_at", { ascending: false }),
      supabase
        .from("analytics_service_dimensions")
        .select("code,label,kind")
        .eq("organization_id", access.organizationId)
        .order("label"),
    ]);
    savedAnalyticsViews = (viewsResult.data ?? []).map((view) => ({
      id: view.id,
      name: view.name,
      moduleId: view.module_id,
      filters: view.filters as Record<string, string | null>,
    }));
    analyticsServiceDimensions = (dimensionsResult.data ?? []).map(
      (dimension) => ({
        code: dimension.code,
        label: dimension.label,
        kind: dimension.kind as AnalyticsServiceDimension["kind"],
      }),
    );
  }

  if (
    module === "incidencias" ||
    module === "proyectos"
  ) {
    const supabase = await createClient();
    const [incidentsResult, eventsResult, membersResult] = await Promise.all([
      supabase.from("incidents").select("id,title,description,status,priority,category,affected_service,impact_scope,detection_channel,root_cause,first_response_at,corrective_task_id,project_id,requester_person_id,assignee_person_id,sla_due_at,resolution,created_at,updated_at,project:projects(name),requester:people!incidents_requester_person_id_fkey(display_name),assignee:people!incidents_assignee_person_id_fkey(display_name)").eq("organization_id", access.organizationId).order("updated_at", { ascending: false }),
      supabase.from("incident_events").select("id,incident_id,kind,from_status,to_status,note,created_at,actor:profiles!incident_events_actor_profile_id_fkey(display_name)").eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(100),
      supabase.from("people").select("id,display_name").eq("organization_id", access.organizationId).eq("status", "active"),
    ]);
    if (incidentsResult.error || eventsResult.error || membersResult.error) incidentLoadError = "Vuelve a intentarlo. Si el problema continúa, revisa la conexión local.";
    incidents = (incidentsResult.data ?? []).map((item) => ({ id: item.id, title: item.title, description: item.description, status: item.status, priority: item.priority, category: item.category, affectedService: item.affected_service, impactScope: item.impact_scope as Incident["impactScope"], detectionChannel: item.detection_channel as Incident["detectionChannel"], rootCause: item.root_cause, firstResponseAt: item.first_response_at, correctiveTaskId: item.corrective_task_id, projectId: item.project_id, projectName: (item.project as unknown as { name: string } | null)?.name ?? null, requesterPersonId: item.requester_person_id, requesterName: (item.requester as unknown as { display_name: string }).display_name, assigneePersonId: item.assignee_person_id, assigneeName: (item.assignee as unknown as { display_name: string } | null)?.display_name ?? null, slaDueAt: item.sla_due_at, resolution: item.resolution, createdAt: item.created_at, updatedAt: item.updated_at }));
    incidentEvents = (eventsResult.data ?? []).map((event) => ({ id: event.id, incidentId: event.incident_id, kind: event.kind, fromStatus: event.from_status, toStatus: event.to_status, note: event.note, actorName: (event.actor as unknown as { display_name: string } | null)?.display_name ?? "Sistema", createdAt: event.created_at }));
    incidentAssignees = (membersResult.data ?? []).map((person) => person.display_name);
  }

  if (
    module === "personal" ||
    module === "proyectos" ||
    module === "analitica" ||
    module === "operaciones"
  ) {
    const supabase = await createClient();
    const [peopleResult, eventsResult] = await Promise.all([
      supabase.from("people").select("id,display_name,team,position_title,status,role_code,manager_person_id,employment_contract_type,employment_start_date,employment_end_date,created_at,updated_at").eq("organization_id", access.organizationId).order("display_name"),
      supabase.from("people_events").select("id,person_id,kind,note,created_at,actor:profiles!people_events_actor_profile_id_fkey(display_name)").eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(100),
    ]);
    if (peopleResult.error || eventsResult.error) peopleLoadError = "Vuelve a intentarlo. Si el problema continúa, revisa la conexión local.";
    people = (peopleResult.data ?? []).map((person) => ({
      id: person.id,
      displayName: person.display_name,
      team: person.team,
      positionTitle: person.position_title,
      status: person.status,
      roleCode: person.role_code,
      managerPersonId: person.manager_person_id,
      employmentContractType:
        person.employment_contract_type as Person["employmentContractType"],
      employmentStartDate: person.employment_start_date,
      employmentEndDate: person.employment_end_date,
      createdAt: person.created_at,
      updatedAt: person.updated_at,
    }));
    peopleEvents = (eventsResult.data ?? []).map((event) => ({ id: event.id, personId: event.person_id, kind: event.kind, note: event.note, actorName: (event.actor as unknown as { display_name: string } | null)?.display_name ?? "Sistema", createdAt: event.created_at }));
  }

  if (module === "novedades") {
    canManageChangelog = await hasWorkspacePermission("changelog.entries.manage");
    const supabase = await createClient();
    const [entriesResult, eventsResult] = await Promise.all([
      supabase.from("changelog_entries").select("id,version,title,summary,status,published_at,created_at,updated_at,creator:profiles!changelog_entries_created_by_fkey(display_name)").eq("organization_id", access.organizationId).order("updated_at", { ascending: false }),
      supabase.from("changelog_events").select("id,entry_id,from_status,to_status,note,created_at,actor:profiles!changelog_events_actor_profile_id_fkey(display_name)").eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(100),
    ]);
    if (entriesResult.error || eventsResult.error) changelogLoadError = "Vuelve a intentarlo. Si el problema continúa, revisa la conexión local.";
    changelogEntries = (entriesResult.data ?? []).map((entry) => ({ id: entry.id, version: entry.version, title: entry.title, summary: entry.summary, status: entry.status, createdBy: (entry.creator as unknown as { display_name: string }).display_name, publishedAt: entry.published_at, createdAt: entry.created_at, updatedAt: entry.updated_at }));
    changelogEvents = (eventsResult.data ?? []).map((event) => ({ id: event.id, entryId: event.entry_id, fromStatus: event.from_status, toStatus: event.to_status, note: event.note, actorName: (event.actor as unknown as { display_name: string } | null)?.display_name ?? "Sistema", createdAt: event.created_at }));
  }

  if (module === "configuracion") {
    canManageSettings = await hasWorkspacePermission("settings.workspace.manage");
    const supabase = await createClient();
    const [modulesResult, rolesResult, membershipsResult, invitationsResult, auditResult, configurationResult] = await Promise.all([
      supabase.from("module_settings").select("module_id,enabled,sort_order").eq("organization_id", access.organizationId).order("sort_order"),
      supabase.from("roles").select("id,code,name,color,role_permissions(permissions(code))").eq("organization_id", access.organizationId).order("name"),
      supabase.from("memberships").select("id,profile_id,role_id,status,profiles!inner(display_name)").eq("organization_id", access.organizationId).order("created_at"),
      supabase.from("invitations").select("id,email,role_id,expires_at,accepted_at,revoked_at,created_at").eq("organization_id", access.organizationId).order("created_at", { ascending: false }),
      supabase.from("audit_events").select("id,event_type,entity_type,entity_id,metadata,created_at,actor:profiles!audit_events_actor_profile_id_fkey(display_name)").eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(100),
      supabase.from("workspace_configuration").select("configuration").eq("organization_id", access.organizationId).maybeSingle(),
    ]);
    if (modulesResult.error || rolesResult.error || membershipsResult.error || invitationsResult.error || auditResult.error || configurationResult.error) settingsLoadError = "Vuelve a intentarlo. Si el problema continúa, revisa la conexión local.";
    const storedModules = new Map((modulesResult.data ?? []).map((setting) => [setting.module_id, setting]));
    moduleSettings = createDefaultModuleSettings().map((fallback) => { const stored = storedModules.get(fallback.moduleId); return stored ? { moduleId: fallback.moduleId, enabled: stored.enabled, sortOrder: stored.sort_order } : fallback; }).sort((a, b) => a.sortOrder - b.sortOrder);
    roles = (rolesResult.data ?? []).map((role) => ({ id: role.id, code: role.code, name: role.name, color: role.color, permissionCodes: role.role_permissions.flatMap((assignment) => { const value = assignment.permissions as unknown as { code: string } | Array<{ code: string }>; return (Array.isArray(value) ? value : [value]).map((permission) => permission.code as PermissionCode); }) }));
    memberships = (membershipsResult.data ?? []).map((membership) => ({ id: membership.id, personId: membership.profile_id, displayName: (membership.profiles as unknown as { display_name: string }).display_name, roleId: membership.role_id, status: membership.status }));
    const now = new Date().toISOString();
    invitations = (invitationsResult.data ?? []).map((invitation) => ({ id: invitation.id, email: invitation.email, roleId: invitation.role_id, status: invitation.revoked_at ? "revoked" : invitation.accepted_at ? "accepted" : invitation.expires_at < now ? "expired" : "pending", expiresAt: invitation.expires_at, createdAt: invitation.created_at }));
    adminAuditEvents = (auditResult.data ?? []).map((event) => ({ id: String(event.id), eventType: event.event_type, entityType: event.entity_type, entityId: event.entity_id, actorName: (event.actor as unknown as { display_name: string } | null)?.display_name ?? "Sistema", summary: event.event_type.replaceAll("_", " ").replaceAll(".", " · "), createdAt: event.created_at }));
    workspaceConfiguration = parseWorkspaceConfiguration(
      configurationResult.data?.configuration,
    );
  }

  if (module === "tesoreria") {
    canManageTreasury = await hasWorkspacePermission("treasury.entries.manage");
    const supabase = await createClient();
    const [entriesResult, eventsResult] = await Promise.all([
      supabase
        .from("treasury_entries")
        .select("id,entry_date,concept,category,source,amount_cents,currency,status,created_at,updated_at,creator:profiles!treasury_entries_created_by_fkey(display_name)")
        .eq("organization_id", access.organizationId)
        .order("entry_date", { ascending: false }),
      supabase
        .from("treasury_events")
        .select("id,entry_id,kind,from_status,to_status,note,created_at,actor:profiles!treasury_events_actor_profile_id_fkey(display_name)")
        .eq("organization_id", access.organizationId)
        .order("created_at", { ascending: false })
        .limit(150),
    ]);
    if (entriesResult.error || eventsResult.error) {
      treasuryLoadError = "Vuelve a intentarlo. Si el problema continúa, revisa tus permisos o la conexión local.";
    }
    treasuryEntries = (entriesResult.data ?? []).map((entry) => ({
      id: entry.id,
      entryDate: entry.entry_date,
      concept: entry.concept,
      category: entry.category,
      source: entry.source as TreasuryEntry["source"],
      amountCents: entry.amount_cents,
      currency: entry.currency as TreasuryCurrency,
      status: entry.status,
      createdBy: (entry.creator as unknown as { display_name: string }).display_name,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
    }));
    treasuryEvents = (eventsResult.data ?? []).map((event) => ({
      id: String(event.id),
      entryId: event.entry_id,
      kind: event.kind as TreasuryEvent["kind"],
      fromStatus: event.from_status,
      toStatus: event.to_status,
      note: event.note,
      actorName: (event.actor as unknown as { display_name: string } | null)?.display_name ?? "Sistema",
      createdAt: event.created_at,
    }));
  }

  if (module === "nominas") {
    canManagePayroll = await hasWorkspacePermission("payroll.runs.manage");
    const supabase = await createClient();
    const [runsResult, eventsResult, participantsResult] = await Promise.all([
      supabase.from("payroll_runs").select("id,period_start,period_end,people_count,gross_total_cents,deduction_total_cents,net_total_cents,employer_cost_total_cents,currency,notes,status,created_at,updated_at,creator:profiles!payroll_runs_created_by_fkey(display_name)").eq("organization_id", access.organizationId).order("period_start", { ascending: false }),
      supabase.from("payroll_events").select("id,run_id,kind,from_status,to_status,note,created_at,actor:profiles!payroll_events_actor_profile_id_fkey(display_name)").eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(150),
      supabase.from("payroll_participants").select("id,run_id,person_id,inclusion_status,validation_status,person:people!payroll_participants_person_id_fkey(display_name,team,position_title)").eq("organization_id", access.organizationId).order("created_at"),
    ]);
    if (participantsResult.error) payrollLoadError = "Vuelve a intentarlo. Si el problema continúa, revisa tus permisos o la conexión local.";
    if (runsResult.error || eventsResult.error) payrollLoadError = "Vuelve a intentarlo. Si el problema continúa, revisa tus permisos o la conexión local.";
    payrollRuns = (runsResult.data ?? []).map((run) => ({ id: run.id, periodStart: run.period_start, periodEnd: run.period_end, peopleCount: run.people_count, grossTotalCents: run.gross_total_cents, deductionTotalCents: run.deduction_total_cents, netTotalCents: run.net_total_cents ?? run.gross_total_cents - run.deduction_total_cents, employerCostTotalCents: run.employer_cost_total_cents ?? undefined, currency: run.currency as PayrollCurrency, notes: run.notes, status: run.status, createdBy: (run.creator as unknown as { display_name: string }).display_name, createdAt: run.created_at, updatedAt: run.updated_at }));
    payrollEvents = (eventsResult.data ?? []).map((event) => ({ id: String(event.id), runId: event.run_id, kind: event.kind as PayrollEvent["kind"], fromStatus: event.from_status, toStatus: event.to_status, note: event.note, actorName: (event.actor as unknown as { display_name: string } | null)?.display_name ?? "Sistema", createdAt: event.created_at }));
    payrollParticipants = (participantsResult.data ?? []).map((participant) => {
      const person = participant.person as unknown as { display_name: string; team: string; position_title: string };
      return {
        id: participant.id,
        runId: participant.run_id,
        personId: participant.person_id,
        personName: person.display_name,
        team: person.team,
        positionTitle: person.position_title,
        inclusionStatus:
          participant.inclusion_status as PayrollParticipant["inclusionStatus"],
        validationStatus:
          participant.validation_status as PayrollParticipant["validationStatus"],
      };
    });
  }

  if (
    module === "tesoreria" ||
    module === "nominas" ||
    module === "personal" ||
    module === "analitica"
  ) {
    canManageIntegrations = await hasWorkspacePermission("integrations.runs.manage");
    const supabase = await createClient();
    const [connectorsResult, runsResult, issuesResult] = await Promise.all([
      supabase
        .from("integration_connectors")
        .select("id,code,name,kind,enabled,schedule_cron,last_run_at")
        .eq("organization_id", access.organizationId)
        .order("name"),
      supabase
        .from("integration_runs")
        .select("id,connector_id,effective_date,status,trigger_kind,source_sequence,processed_count,imported_count,duplicate_count,error_count,safe_summary,started_at,finished_at")
        .eq("organization_id", access.organizationId)
        .order("created_at", { ascending: false })
        .limit(module === "analitica" ? 0 : 50),
      supabase
        .from("data_quality_issues")
        .select("id,run_id,severity,code,safe_message,resolved_at,created_at")
        .eq("organization_id", access.organizationId)
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(module === "analitica" ? 0 : 50),
    ]);
    integrationConnectors = (connectorsResult.data ?? []).map((connector) => ({
      id: connector.id,
      code: connector.code,
      name: connector.name,
      kind: connector.kind,
      enabled: connector.enabled,
      scheduleCron: connector.schedule_cron,
      lastRunAt: connector.last_run_at,
    }));
    integrationRuns = (runsResult.data ?? []).map((run) => ({
      id: run.id,
      connectorId: run.connector_id,
      effectiveDate: run.effective_date,
      status: run.status,
      triggerKind: run.trigger_kind as IntegrationRun["triggerKind"],
      sourceSequence: run.source_sequence,
      processedCount: run.processed_count,
      importedCount: run.imported_count,
      duplicateCount: run.duplicate_count,
      errorCount: run.error_count,
      safeSummary: run.safe_summary,
      startedAt: run.started_at ?? new Date(0).toISOString(),
      finishedAt: run.finished_at ?? run.started_at ?? new Date(0).toISOString(),
    }));
    dataQualityIssues = (issuesResult.data ?? []).map((issue) => ({
      id: issue.id,
      runId: issue.run_id,
      severity: issue.severity as DataQualityIssue["severity"],
      code: issue.code,
      safeMessage: issue.safe_message,
      resolvedAt: issue.resolved_at,
      createdAt: issue.created_at,
    }));
  }

  if (
    module === "proyectos" ||
    module === "tareas" ||
    module === "incidencias" ||
    module === "analitica" ||
    module === "operaciones"
  ) {
    canManageProjects = await hasWorkspacePermission("projects.items.manage");
    const supabase = await createClient();
    const [projectsResult, membersResult, eventsResult] = await Promise.all([
      supabase
        .from("projects")
        .select(
          "id,code,name,summary,status,health,owner_person_id,start_date,target_date,color,created_at,updated_at,owner:people!projects_owner_person_id_fkey(display_name)",
        )
        .eq("organization_id", access.organizationId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("project_members")
        .select("project_id,person_id")
        .eq("organization_id", access.organizationId),
      supabase
        .from("project_events")
        .select(
          "id,project_id,kind,note,created_at,actor:profiles!project_events_actor_profile_id_fkey(display_name)",
        )
        .eq("organization_id", access.organizationId)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (projectsResult.error || membersResult.error || eventsResult.error) {
      projectsLoadError =
        "Vuelve a intentarlo. Si el problema continúa, revisa la conexión local.";
    }
    projects = (projectsResult.data ?? []).map((project) => ({
      id: project.id,
      code: project.code,
      name: project.name,
      summary: project.summary,
      status: project.status,
      health: project.health,
      ownerPersonId: project.owner_person_id,
      ownerName:
        (
          project.owner as unknown as { display_name: string } | null
        )?.display_name ?? null,
      startDate: project.start_date,
      targetDate: project.target_date,
      color: project.color,
      memberIds: (membersResult.data ?? [])
        .filter((member) => member.project_id === project.id)
        .map((member) => member.person_id),
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    }));
    projectEvents = (eventsResult.data ?? []).map((event) => ({
      id: event.id,
      projectId: event.project_id,
      kind: event.kind,
      note: event.note,
      actorName:
        (
          event.actor as unknown as { display_name: string } | null
        )?.display_name ?? "Sistema",
      createdAt: event.created_at,
    }));
  }

  if (
    module === "tareas" ||
    module === "proyectos"
  ) {
    const supabase = await createClient();
    const [tasksResult, membersResult] = await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id,title,description,status,priority,project_id,assignee_person_id,due_date,created_at,updated_at,project:projects(name),assignee:people!tasks_assignee_person_id_fkey(display_name),creator:profiles!tasks_created_by_fkey(display_name)",
        )
        .eq("organization_id", access.organizationId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("people")
        .select("id,profile_id,display_name")
        .eq("organization_id", access.organizationId)
        .eq("status", "active"),
    ]);
    const visibleTaskIds = (tasksResult.data ?? []).map((task) => task.id);
    const [dependenciesResult, commentsResult, eventsResult] =
      visibleTaskIds.length
        ? await Promise.all([
            supabase
              .from("task_dependencies")
              .select("id,task_id,depends_on_task_id,created_at")
              .eq("organization_id", access.organizationId)
              .in("task_id", visibleTaskIds),
            supabase
              .from("task_comments")
              .select(
                "id,task_id,body,created_at,author:profiles!task_comments_author_profile_id_fkey(display_name)",
              )
              .eq("organization_id", access.organizationId)
              .in("task_id", visibleTaskIds)
              .order("created_at", { ascending: false }),
            supabase
              .from("task_events")
              .select(
                "id,task_id,kind,from_status,to_status,note,created_at,actor:profiles!task_events_actor_profile_id_fkey(display_name)",
              )
              .eq("organization_id", access.organizationId)
              .in("task_id", visibleTaskIds)
              .order("created_at", { ascending: false })
              .limit(100),
          ])
        : [
            { data: [], error: null },
            { data: [], error: null },
            { data: [], error: null },
          ];

    if (
      tasksResult.error ||
      dependenciesResult.error ||
      commentsResult.error ||
      eventsResult.error ||
      membersResult.error
    ) {
      taskLoadError =
        "Vuelve a intentarlo. Si el problema continúa, revisa la conexión local.";
    }

    tasks = (tasksResult.data ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      projectId: task.project_id,
      projectName:
        (task.project as unknown as { name: string } | null)?.name ?? null,
      assigneePersonId: task.assignee_person_id,
      assigneeName:
        (task.assignee as unknown as { display_name: string } | null)
          ?.display_name ?? null,
      dueDate: task.due_date,
      createdBy:
        (task.creator as unknown as { display_name: string }).display_name,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    }));
    taskDependencies = (dependenciesResult.data ?? []).map((dependency) => ({
      id: dependency.id,
      taskId: dependency.task_id,
      dependsOnTaskId: dependency.depends_on_task_id,
      createdAt: dependency.created_at,
    }));
    taskComments = (commentsResult.data ?? []).map((comment) => ({
      id: comment.id,
      taskId: comment.task_id,
      authorName:
        (comment.author as unknown as { display_name: string }).display_name,
      body: comment.body,
      createdAt: comment.created_at,
    }));
    taskEvents = (eventsResult.data ?? []).map((event) => ({
      id: event.id,
      taskId: event.task_id,
      kind: event.kind,
      fromStatus: event.from_status,
      toStatus: event.to_status,
      note: event.note,
      actorName:
        (event.actor as unknown as { display_name: string } | null)
          ?.display_name ?? "Sistema",
      createdAt: event.created_at,
    }));
    taskAssignees = (membersResult.data ?? []).map(
      (person) => person.display_name,
    );
    taskMentionOptions = (membersResult.data ?? [])
      .filter((person) => person.profile_id && person.profile_id !== access.userId)
      .map((person) => ({ id: person.profile_id!, label: person.display_name }));
    currentUserName = (membersResult.data ?? [])
      .filter((person) => person.profile_id === access.userId)
      .map(
        (person) => person.display_name,
      )[0];
  }

  if (module === "operaciones") {
    canManageOperations = await hasWorkspacePermission("operations.automations.manage");
    const supabase = await createClient();
    const [connectionsResult, rulesResult, runsResult, templatesResult, recurrencesResult, capacityResult, notificationsResult, exportsResult] = await Promise.all([
      supabase.from("workspace_connections").select("id,provider,status,capabilities,account_label,connected_at").eq("organization_id", access.organizationId).eq("profile_id", access.userId).order("provider"),
      supabase.from("automation_rules").select("id,name,trigger_code,action_code,condition_config,enabled,last_run_at").eq("organization_id", access.organizationId).order("created_at", { ascending: false }),
      supabase.from("automation_runs").select("id,rule_id,status,summary,created_at").eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(50),
      supabase.from("project_templates").select("id,name,description,duration_days,tasks,role_codes").eq("organization_id", access.organizationId).order("name"),
      supabase.from("task_recurrences").select("id,name,frequency,next_run_date,enabled").eq("organization_id", access.organizationId).order("next_run_date"),
      supabase.from("capacity_allocations").select("id,person_id,project_id,week_start,allocated_hours,available_hours,person:people(display_name),project:projects(name)").eq("organization_id", access.organizationId).order("week_start", { ascending: false }).limit(100),
      supabase.from("operational_notifications").select("id,title,description,priority,status,source,href,created_at").eq("organization_id", access.organizationId).eq("recipient_profile_id", access.userId).order("created_at", { ascending: false }).limit(100),
      supabase.from("export_jobs").select("id,name,module_id,target,status,row_count,created_at,external_url").eq("organization_id", access.organizationId).eq("profile_id", access.userId).order("created_at", { ascending: false }).limit(100),
    ]);
    if ([connectionsResult, rulesResult, runsResult, templatesResult, recurrencesResult, capacityResult, notificationsResult, exportsResult].some((result) => result.error)) operationsLoadError = "No se pudo cargar toda la información operativa. Revisa la conexión y vuelve a intentarlo.";
    const storedConnections = new Map((connectionsResult.data ?? []).map((connection) => [connection.provider, connection]));
    workspaceConnections = workspaceConnectionSchema.array().parse(createDefaultOperationsState().workspaceConnections.map((fallback) => { const connection = storedConnections.get(fallback.provider); return connection ? { id: connection.id, provider: connection.provider, status: connection.status, capabilities: connection.capabilities, accountLabel: connection.account_label, connectedAt: connection.connected_at } : { ...fallback, status: "revoked", accountLabel: "Sin conexión" }; }));
    automationRules = automationRuleSchema.array().parse((rulesResult.data ?? []).map((rule) => ({ id: rule.id, name: rule.name, trigger: rule.trigger_code, action: rule.action_code, condition: Object.keys(rule.condition_config ?? {}).length ? rule.condition_config : null, enabled: rule.enabled, lastRunAt: rule.last_run_at })));
    automationRuns = automationRunSchema.array().parse((runsResult.data ?? []).map((run) => ({ id: run.id, ruleId: run.rule_id, status: run.status, summary: run.summary, createdAt: run.created_at })));
    projectTemplates = projectTemplateSchema.array().parse((templatesResult.data ?? []).map((template) => ({ id: template.id, name: template.name, description: template.description, durationDays: template.duration_days, taskCount: Array.isArray(template.tasks) ? template.tasks.length : 0, roleCodes: template.role_codes })));
    recurrenceRules = recurrenceRuleSchema.array().parse((recurrencesResult.data ?? []).map((rule) => ({ id: rule.id, name: rule.name, frequency: rule.frequency, nextRunDate: rule.next_run_date, enabled: rule.enabled })));
    capacityAllocations = capacityAllocationSchema.array().parse((capacityResult.data ?? []).map((allocation) => ({ id: allocation.id, personId: allocation.person_id, projectId: allocation.project_id, personName: (allocation.person as unknown as { display_name: string }).display_name, projectName: (allocation.project as unknown as { name: string }).name, weekStart: allocation.week_start, allocatedHours: Number(allocation.allocated_hours), availableHours: Number(allocation.available_hours) })));
    operationalNotifications = operationalNotificationSchema.array().parse((notificationsResult.data ?? []).map((notification) => ({ id: notification.id, title: notification.title, description: notification.description, priority: notification.priority, status: notification.status, source: notification.source, href: notification.href, createdAt: notification.created_at })));
    exportJobs = exportJobSchema.array().parse((exportsResult.data ?? []).map((job) => ({ id: job.id, name: job.name, moduleId: job.module_id, target: job.target, status: job.status, rowCount: job.row_count, createdAt: job.created_at, externalUrl: job.external_url })));
  }

  return (
    <AuthenticatedApp
      activeModule={module}
      organizationName={access.organizationName}
      scenarioAnchorDate={
        currentOrganization?.scenario_generated_through_date ??
        currentOrganization?.scenario_anchor_date ??
        new Date().toISOString().slice(0, 10)
      }
      avatarUrl={signedAvatar?.data?.signedUrl ?? null}
      displayName={currentProfile?.alias ?? currentProfile?.display_name}
      theme={
        currentProfile?.theme === "light" ||
        currentProfile?.theme === "dark"
          ? currentProfile.theme
          : "light"
      }
      density={
        currentProfile?.density === "compact" ? "compact" : "comfortable"
      }
      reducedMotion={currentProfile?.reduced_motion ?? false}
      highContrast={currentProfile?.high_contrast ?? false}
      leaveRequests={leaveRequests}
      leaveEvents={leaveEvents}
      leaveLoadError={leaveLoadError}
      tasks={tasks}
      taskDependencies={taskDependencies}
      taskComments={taskComments}
      taskEvents={taskEvents}
      taskAssignees={taskAssignees}
      taskMentionOptions={taskMentionOptions}
      currentUserName={currentUserName}
      taskLoadError={taskLoadError}
      incidents={incidents}
      incidentEvents={incidentEvents}
      incidentAssignees={incidentAssignees}
      incidentLoadError={incidentLoadError}
      people={people}
      peopleEvents={peopleEvents}
      peopleLoadError={peopleLoadError}
      projects={projects}
      projectEvents={projectEvents}
      projectsLoadError={projectsLoadError}
      canManageProjects={canManageProjects}
      changelogEntries={changelogEntries}
      changelogEvents={changelogEvents}
      changelogLoadError={changelogLoadError}
      canManageChangelog={canManageChangelog}
      treasuryEntries={treasuryEntries}
      treasuryEvents={treasuryEvents}
      treasuryLoadError={treasuryLoadError}
      canManageTreasury={canManageTreasury}
      payrollRuns={payrollRuns}
      payrollParticipants={payrollParticipants}
      payrollEvents={payrollEvents}
      payrollLoadError={payrollLoadError}
      canManagePayroll={canManagePayroll}
      integrationConnectors={integrationConnectors}
      integrationRuns={integrationRuns}
      dataQualityIssues={dataQualityIssues}
      canManageIntegrations={canManageIntegrations}
      savedAnalyticsViews={savedAnalyticsViews}
      analyticsServiceDimensions={analyticsServiceDimensions}
      moduleSettings={moduleSettings}
      roles={roles}
      memberships={memberships}
      invitations={invitations}
      adminAuditEvents={adminAuditEvents}
      settingsLoadError={settingsLoadError}
      canManageSettings={canManageSettings}
      workspaceConfiguration={workspaceConfiguration}
      workspaceConnections={workspaceConnections}
      automationRules={automationRules}
      automationRuns={automationRuns}
      projectTemplates={projectTemplates}
      recurrenceRules={recurrenceRules}
      capacityAllocations={capacityAllocations}
      operationalNotifications={operationalNotifications}
      exportJobs={exportJobs}
      operationsLoadError={operationsLoadError}
      canManageOperations={canManageOperations}
      focusedEntityId={focusedEntityId}
      workspaceLoadError={
        scenarioError || profileError || organizationError
          ? "No se pudo actualizar toda la información. Puedes continuar con los datos disponibles y reintentar más tarde."
          : undefined
      }
    />
  );
}
