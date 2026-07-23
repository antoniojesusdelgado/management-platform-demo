import { IconLock, IconSettings } from "@tabler/icons-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthenticatedApp } from "@/components/authenticated-app";
import { isModuleId } from "@/domain/modules";
import type { Incident, IncidentEvent } from "@/domain/incidents";
import type { Person, PersonEvent } from "@/domain/people";
import type { ChangelogEntry, ChangelogEvent } from "@/domain/changelog";
import type { TreasuryCurrency, TreasuryEntry, TreasuryEvent } from "@/domain/treasury";
import type { PayrollCurrency, PayrollEvent, PayrollRun } from "@/domain/payroll";
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

export default async function AppModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
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
              Abrir demo invitada
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
              Workspace no disponible
            </p>
            <h1>No se pudo preparar tu espacio de demostración</h1>
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

  let leaveRequests: LeaveRequest[] = [];
  let leaveEvents: LeaveRequestEvent[] = [];
  let leaveLoadError: string | undefined;
  let tasks: TaskItem[] = [];
  let taskDependencies: TaskDependency[] = [];
  let taskComments: TaskComment[] = [];
  let taskEvents: TaskEvent[] = [];
  let taskAssignees: string[] = [];
  let currentUserName: string | undefined;
  let taskLoadError: string | undefined;
  let incidents: Incident[] = [];
  let incidentEvents: IncidentEvent[] = [];
  let incidentAssignees: string[] = [];
  let incidentLoadError: string | undefined;
  let people: Person[] = [];
  let peopleEvents: PersonEvent[] = [];
  let peopleLoadError: string | undefined;
  let changelogEntries: ChangelogEntry[] = [];
  let changelogEvents: ChangelogEvent[] = [];
  let changelogLoadError: string | undefined;
  let canManageChangelog = false;
  let treasuryEntries: TreasuryEntry[] = [];
  let treasuryEvents: TreasuryEvent[] = [];
  let treasuryLoadError: string | undefined;
  let canManageTreasury = false;
  let payrollRuns: PayrollRun[] = [];
  let payrollEvents: PayrollEvent[] = [];
  let payrollLoadError: string | undefined;
  let canManagePayroll = false;
  let moduleSettings: ModuleSetting[] = [];
  let roles: ConfigurableRole[] = [];
  let memberships: WorkspaceMembership[] = [];
  let invitations: WorkspaceInvitation[] = [];
  let adminAuditEvents: AdminAuditEvent[] = [];
  let settingsLoadError: string | undefined;
  let canManageSettings = false;

  if (module === "vacaciones" || module === "personal") {
    const supabase = await createClient();
    const [requestsResult, eventsResult] = await Promise.all([
      supabase
        .from("leave_requests")
        .select(
          "id,start_date,end_date,business_days,leave_type,reason,status,created_at,updated_at,profiles!inner(display_name)",
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
        request.profiles as unknown as { display_name: string }
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

  if (module === "incidencias") {
    const supabase = await createClient();
    const [incidentsResult, eventsResult, membersResult] = await Promise.all([
      supabase.from("incidents").select("id,title,description,status,priority,category,sla_due_at,resolution,created_at,updated_at,requester:profiles!incidents_requester_profile_id_fkey(display_name),assignee:profiles!incidents_assignee_profile_id_fkey(display_name)").eq("organization_id", access.organizationId).order("updated_at", { ascending: false }),
      supabase.from("incident_events").select("id,incident_id,kind,from_status,to_status,note,created_at,actor:profiles!incident_events_actor_profile_id_fkey(display_name)").eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(100),
      supabase.from("memberships").select("profile_id,profiles!inner(display_name)").eq("organization_id", access.organizationId).eq("status", "active"),
    ]);
    if (incidentsResult.error || eventsResult.error || membersResult.error) incidentLoadError = "Vuelve a intentarlo. Si el problema continúa, revisa la conexión local.";
    incidents = (incidentsResult.data ?? []).map((item) => ({ id: item.id, title: item.title, description: item.description, status: item.status, priority: item.priority, category: item.category, requesterName: (item.requester as unknown as { display_name: string }).display_name, assigneeName: (item.assignee as unknown as { display_name: string } | null)?.display_name ?? null, slaDueAt: item.sla_due_at, resolution: item.resolution, createdAt: item.created_at, updatedAt: item.updated_at }));
    incidentEvents = (eventsResult.data ?? []).map((event) => ({ id: event.id, incidentId: event.incident_id, kind: event.kind, fromStatus: event.from_status, toStatus: event.to_status, note: event.note, actorName: (event.actor as unknown as { display_name: string } | null)?.display_name ?? "Sistema", createdAt: event.created_at }));
    incidentAssignees = (membersResult.data ?? []).map((member) => (member.profiles as unknown as { display_name: string }).display_name);
  }

  if (module === "personal") {
    const supabase = await createClient();
    const [peopleResult, eventsResult] = await Promise.all([
      supabase.from("people").select("id,display_name,team,position_title,status,role_code,created_at,updated_at").eq("organization_id", access.organizationId).order("display_name"),
      supabase.from("people_events").select("id,person_id,kind,note,created_at,actor:profiles!people_events_actor_profile_id_fkey(display_name)").eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(100),
    ]);
    if (peopleResult.error || eventsResult.error) peopleLoadError = "Vuelve a intentarlo. Si el problema continúa, revisa la conexión local.";
    people = (peopleResult.data ?? []).map((person) => ({ id: person.id, displayName: person.display_name, team: person.team, positionTitle: person.position_title, status: person.status, roleCode: person.role_code, createdAt: person.created_at, updatedAt: person.updated_at }));
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
    const [modulesResult, rolesResult, membershipsResult, invitationsResult, auditResult] = await Promise.all([
      supabase.from("module_settings").select("module_id,enabled,sort_order").eq("organization_id", access.organizationId).order("sort_order"),
      supabase.from("roles").select("id,code,name,color,role_permissions(permissions(code))").eq("organization_id", access.organizationId).order("name"),
      supabase.from("memberships").select("id,profile_id,role_id,status,profiles!inner(display_name)").eq("organization_id", access.organizationId).order("created_at"),
      supabase.from("invitations").select("id,email,role_id,expires_at,accepted_at,revoked_at,created_at").eq("organization_id", access.organizationId).order("created_at", { ascending: false }),
      supabase.from("audit_events").select("id,event_type,entity_type,entity_id,metadata,created_at,actor:profiles!audit_events_actor_profile_id_fkey(display_name)").eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(100),
    ]);
    if (modulesResult.error || rolesResult.error || membershipsResult.error || invitationsResult.error || auditResult.error) settingsLoadError = "Vuelve a intentarlo. Si el problema continúa, revisa la conexión local.";
    const storedModules = new Map((modulesResult.data ?? []).map((setting) => [setting.module_id, setting]));
    moduleSettings = createDefaultModuleSettings().map((fallback) => { const stored = storedModules.get(fallback.moduleId); return stored ? { moduleId: fallback.moduleId, enabled: stored.enabled, sortOrder: stored.sort_order } : fallback; }).sort((a, b) => a.sortOrder - b.sortOrder);
    roles = (rolesResult.data ?? []).map((role) => ({ id: role.id, code: role.code, name: role.name, color: role.color, permissionCodes: role.role_permissions.flatMap((assignment) => { const value = assignment.permissions as unknown as { code: string } | Array<{ code: string }>; return (Array.isArray(value) ? value : [value]).map((permission) => permission.code as PermissionCode); }) }));
    memberships = (membershipsResult.data ?? []).map((membership) => ({ id: membership.id, personId: membership.profile_id, displayName: (membership.profiles as unknown as { display_name: string }).display_name, roleId: membership.role_id, status: membership.status }));
    const now = new Date().toISOString();
    invitations = (invitationsResult.data ?? []).map((invitation) => ({ id: invitation.id, email: invitation.email, roleId: invitation.role_id, status: invitation.revoked_at ? "revoked" : invitation.accepted_at ? "accepted" : invitation.expires_at < now ? "expired" : "pending", expiresAt: invitation.expires_at, createdAt: invitation.created_at }));
    adminAuditEvents = (auditResult.data ?? []).map((event) => ({ id: String(event.id), eventType: event.event_type, entityType: event.entity_type, entityId: event.entity_id, actorName: (event.actor as unknown as { display_name: string } | null)?.display_name ?? "Sistema", summary: event.event_type.replaceAll("_", " ").replaceAll(".", " · "), createdAt: event.created_at }));
  }

  if (module === "tesoreria") {
    canManageTreasury = await hasWorkspacePermission("treasury.entries.manage");
    const supabase = await createClient();
    const [entriesResult, eventsResult] = await Promise.all([
      supabase
        .from("treasury_entries")
        .select("id,entry_date,concept,amount_cents,currency,status,created_at,updated_at,creator:profiles!treasury_entries_created_by_fkey(display_name)")
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
    const [runsResult, eventsResult] = await Promise.all([
      supabase.from("payroll_runs").select("id,period_start,period_end,people_count,gross_total_cents,deduction_total_cents,net_total_cents,currency,notes,status,created_at,updated_at,creator:profiles!payroll_runs_created_by_fkey(display_name)").eq("organization_id", access.organizationId).order("period_start", { ascending: false }),
      supabase.from("payroll_events").select("id,run_id,kind,from_status,to_status,note,created_at,actor:profiles!payroll_events_actor_profile_id_fkey(display_name)").eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(150),
    ]);
    if (runsResult.error || eventsResult.error) payrollLoadError = "Vuelve a intentarlo. Si el problema continúa, revisa tus permisos o la conexión local.";
    payrollRuns = (runsResult.data ?? []).map((run) => ({ id: run.id, periodStart: run.period_start, periodEnd: run.period_end, peopleCount: run.people_count, grossTotalCents: run.gross_total_cents, deductionTotalCents: run.deduction_total_cents, netTotalCents: run.net_total_cents ?? run.gross_total_cents - run.deduction_total_cents, currency: run.currency as PayrollCurrency, notes: run.notes, status: run.status, createdBy: (run.creator as unknown as { display_name: string }).display_name, createdAt: run.created_at, updatedAt: run.updated_at }));
    payrollEvents = (eventsResult.data ?? []).map((event) => ({ id: String(event.id), runId: event.run_id, kind: event.kind as PayrollEvent["kind"], fromStatus: event.from_status, toStatus: event.to_status, note: event.note, actorName: (event.actor as unknown as { display_name: string } | null)?.display_name ?? "Sistema", createdAt: event.created_at }));
  }

  if (module === "tareas") {
    const supabase = await createClient();
    const [
      tasksResult,
      dependenciesResult,
      commentsResult,
      eventsResult,
      membersResult,
    ] = await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id,title,description,status,priority,due_date,created_at,updated_at,assignee:profiles!tasks_assignee_profile_id_fkey(display_name),creator:profiles!tasks_created_by_fkey(display_name)",
        )
        .eq("organization_id", access.organizationId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("task_dependencies")
        .select("id,task_id,depends_on_task_id,created_at")
        .eq("organization_id", access.organizationId),
      supabase
        .from("task_comments")
        .select("id,task_id,body,created_at,author:profiles!task_comments_author_profile_id_fkey(display_name)")
        .eq("organization_id", access.organizationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("task_events")
        .select("id,task_id,kind,from_status,to_status,note,created_at,actor:profiles!task_events_actor_profile_id_fkey(display_name)")
        .eq("organization_id", access.organizationId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("memberships")
        .select("profile_id,profiles!inner(display_name)")
        .eq("organization_id", access.organizationId)
        .eq("status", "active"),
    ]);

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
      (membership) =>
        (membership.profiles as unknown as { display_name: string })
          .display_name,
    );
    currentUserName = (membersResult.data ?? [])
      .filter((membership) => membership.profile_id === access.userId)
      .map(
        (membership) =>
          (membership.profiles as unknown as { display_name: string })
            .display_name,
      )[0];
  }

  return (
    <AuthenticatedApp
      activeModule={module}
      organizationName={access.organizationName}
      leaveRequests={leaveRequests}
      leaveEvents={leaveEvents}
      leaveLoadError={leaveLoadError}
      tasks={tasks}
      taskDependencies={taskDependencies}
      taskComments={taskComments}
      taskEvents={taskEvents}
      taskAssignees={taskAssignees}
      currentUserName={currentUserName}
      taskLoadError={taskLoadError}
      incidents={incidents}
      incidentEvents={incidentEvents}
      incidentAssignees={incidentAssignees}
      incidentLoadError={incidentLoadError}
      people={people}
      peopleEvents={peopleEvents}
      peopleLoadError={peopleLoadError}
      changelogEntries={changelogEntries}
      changelogEvents={changelogEvents}
      changelogLoadError={changelogLoadError}
      canManageChangelog={canManageChangelog}
      treasuryEntries={treasuryEntries}
      treasuryEvents={treasuryEvents}
      treasuryLoadError={treasuryLoadError}
      canManageTreasury={canManageTreasury}
      payrollRuns={payrollRuns}
      payrollEvents={payrollEvents}
      payrollLoadError={payrollLoadError}
      canManagePayroll={canManagePayroll}
      moduleSettings={moduleSettings}
      roles={roles}
      memberships={memberships}
      invitations={invitations}
      adminAuditEvents={adminAuditEvents}
      settingsLoadError={settingsLoadError}
      canManageSettings={canManageSettings}
    />
  );
}
