"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast, Toaster } from "sonner";
import {
  createLeaveRequestAction,
  transitionLeaveRequestAction,
} from "@/app/app/vacation-actions";
import {
  addTaskCommentAction,
  addTaskDependencyAction,
  createTaskAction,
  transitionTaskAction,
  updateTaskAction,
} from "@/app/app/task-actions";
import { createIncidentAction, transitionIncidentAction, updateIncidentAction } from "@/app/app/incident-actions";
import { createPersonAction, updatePersonAction } from "@/app/app/people-actions";
import {
  createProjectAction,
  updateProjectAction,
} from "@/app/app/project-actions";
import { createChangelogAction, transitionChangelogAction, updateChangelogAction } from "@/app/app/changelog-actions";
import { createInvitationAction, renameOrganizationAction, restoreDemoScenarioV6Action, updateMembershipAction, updateModuleSettingAction, updateRoleMetadataAction, updateRolePermissionsAction, updateWorkspaceConfigurationAction } from "@/app/app/settings-actions";
import { createTreasuryAction, transitionTreasuryAction, updateTreasuryAction } from "@/app/app/treasury-actions";
import { createPayrollAction, transitionPayrollAction, updatePayrollAction } from "@/app/app/payroll-actions";
import { simulateIntegrationAction } from "@/app/app/integration-actions";
import {
  loadAnalyticsSnapshotAction,
  saveAnalyticsViewAction,
} from "@/app/app/analytics-actions";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { ControlCenter } from "@/components/control-center";
import { IntegrationsCenter } from "@/components/integrations-center";
import { IncidentsWorkspace } from "@/components/incidents-workspace";
import { ChangelogWorkspace } from "@/components/changelog-workspace";
import { ModuleWorkspace } from "@/components/module-workspace";
import { PeopleWorkspace } from "@/components/people-workspace";
import { ProjectsWorkspace } from "@/components/projects-workspace";
import { SettingsWorkspace } from "@/components/settings-workspace";
import { TasksWorkspace } from "@/components/tasks-workspace";
import { TreasuryWorkspace } from "@/components/treasury-workspace";
import { PayrollWorkspace } from "@/components/payroll-workspace";
import { VacationsWorkspace } from "@/components/vacations-workspace";
import { ThemePreferencesSync } from "@/components/theme-provider";
import type { ModuleId } from "@/domain/modules";
import type { UserProfile } from "@/domain/profile";
import type { ChangelogEntry, ChangelogEvent, ChangelogInput, ChangelogStatus } from "@/domain/changelog";
import type { PermissionCode } from "@/domain/permissions";
import type { AdminAuditEvent, ConfigurableRole, ModuleSetting, WorkspaceInvitation, WorkspaceMembership, WorkspaceMembershipStatus } from "@/domain/settings";
import type { Incident, IncidentEvent, IncidentInput, IncidentStatus } from "@/domain/incidents";
import type { Person, PersonEvent, PersonInput } from "@/domain/people";
import type {
  Project,
  ProjectEvent,
  ProjectInput,
} from "@/domain/projects";
import type {
  LeaveRequest,
  LeaveRequestEvent,
  LeaveRequestInput,
  LeaveRequestStatus,
} from "@/domain/vacations";
import type { ActionResult } from "@/domain/action-result";
import type {
  TaskComment,
  TaskDependency,
  TaskEvent,
  TaskInput,
  TaskItem,
  TaskStatus,
} from "@/domain/tasks";
import type { TreasuryEntry, TreasuryEvent, TreasuryInput, TreasuryStatus } from "@/domain/treasury";
import type { PayrollEvent, PayrollInput, PayrollParticipant, PayrollRun, PayrollStatus } from "@/domain/payroll";
import type { DataQualityIssue, IntegrationConnector, IntegrationRun, SavedAnalyticsView } from "@/domain/integrations";
import type { AnalyticsServiceDimension } from "@/domain/analytics";
import {
  defaultWorkspaceConfiguration,
  type WorkspaceConfiguration,
} from "@/domain/workspace-configuration";

type AuthenticatedAppProps = {
  activeModule: ModuleId;
  organizationName: string;
  scenarioAnchorDate: string;
  theme?: UserProfile["theme"];
  density?: UserProfile["density"];
  reducedMotion?: boolean;
  highContrast?: boolean;
  avatarUrl?: string | null;
  displayName?: string;
  leaveRequests?: LeaveRequest[];
  leaveEvents?: LeaveRequestEvent[];
  leaveLoadError?: string;
  tasks?: TaskItem[];
  taskDependencies?: TaskDependency[];
  taskComments?: TaskComment[];
  taskEvents?: TaskEvent[];
  taskAssignees?: string[];
  currentUserName?: string;
  taskLoadError?: string;
  incidents?: Incident[];
  incidentEvents?: IncidentEvent[];
  incidentAssignees?: string[];
  incidentLoadError?: string;
  people?: Person[];
  peopleEvents?: PersonEvent[];
  peopleLoadError?: string;
  projects?: Project[];
  projectEvents?: ProjectEvent[];
  projectsLoadError?: string;
  canManageProjects?: boolean;
  changelogEntries?: ChangelogEntry[];
  changelogEvents?: ChangelogEvent[];
  changelogLoadError?: string;
  canManageChangelog?: boolean;
  treasuryEntries?: TreasuryEntry[];
  treasuryEvents?: TreasuryEvent[];
  treasuryLoadError?: string;
  canManageTreasury?: boolean;
  payrollRuns?: PayrollRun[];
  payrollParticipants?: PayrollParticipant[];
  payrollEvents?: PayrollEvent[];
  payrollLoadError?: string;
  canManagePayroll?: boolean;
  integrationConnectors?: IntegrationConnector[];
  integrationRuns?: IntegrationRun[];
  dataQualityIssues?: DataQualityIssue[];
  canManageIntegrations?: boolean;
  savedAnalyticsViews?: SavedAnalyticsView[];
  analyticsServiceDimensions?: AnalyticsServiceDimension[];
  moduleSettings?: ModuleSetting[];
  roles?: ConfigurableRole[];
  memberships?: WorkspaceMembership[];
  invitations?: WorkspaceInvitation[];
  adminAuditEvents?: AdminAuditEvent[];
  settingsLoadError?: string;
  canManageSettings?: boolean;
  workspaceConfiguration?: WorkspaceConfiguration;
  workspaceLoadError?: string;
};

export function AuthenticatedApp({
  activeModule,
  organizationName,
  scenarioAnchorDate,
  theme = "light",
  density = "comfortable",
  reducedMotion = false,
  highContrast = false,
  avatarUrl,
  displayName,
  leaveRequests = [],
  leaveEvents = [],
  leaveLoadError,
  tasks = [],
  taskDependencies = [],
  taskComments = [],
  taskEvents = [],
  taskAssignees = [],
  currentUserName,
  taskLoadError,
  incidents = [],
  incidentEvents = [],
  incidentAssignees = [],
  incidentLoadError,
  people = [],
  peopleEvents = [],
  peopleLoadError,
  projects = [],
  projectEvents = [],
  projectsLoadError,
  canManageProjects = false,
  changelogEntries = [],
  changelogEvents = [],
  changelogLoadError,
  canManageChangelog = false,
  treasuryEntries = [],
  treasuryEvents = [],
  treasuryLoadError,
  canManageTreasury = false,
  payrollRuns = [],
  payrollParticipants = [],
  payrollEvents = [],
  payrollLoadError,
  canManagePayroll = false,
  integrationConnectors = [],
  integrationRuns = [],
  dataQualityIssues = [],
  canManageIntegrations = false,
  savedAnalyticsViews = [],
  analyticsServiceDimensions = [],
  moduleSettings = [],
  roles = [],
  memberships = [],
  invitations = [],
  adminAuditEvents = [],
  settingsLoadError,
  canManageSettings = false,
  workspaceConfiguration = defaultWorkspaceConfiguration,
  workspaceLoadError,
}: AuthenticatedAppProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localName, setLocalName] = useState(organizationName);
  const [summaryAnchor] = useState(
    () => new Date(`${scenarioAnchorDate}T12:00:00.000Z`),
  );

  function performAction<T = undefined>(
    action: () => Promise<ActionResult<T>>,
    successMessage: string,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      startTransition(async () => {
        const result = await action();
        if (result.ok) {
          toast.success(successMessage);
          resolve(true);
          return;
        }
        toast.error(result.message);
        resolve(false);
      });
    });
  }

  function navigate(module: ModuleId) {
    router.push(`/app/${module}`);
  }

  let content;
  if (activeModule === "inicio") {
    const today = summaryAnchor.toISOString().slice(0, 10);
    const inThirtyDays = new Date(summaryAnchor.getTime() + 30 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    content = (
      <Dashboard
        onNavigate={navigate}
        summary={{
          pendingLeaveRequests: leaveRequests.filter(
            (request) => request.status === "submitted",
          ).length,
          upcomingTasks: tasks.filter(
            (task) =>
              task.status !== "completed" &&
              task.dueDate !== null &&
              task.dueDate >= today &&
              task.dueDate <= inThirtyDays,
          ).length,
          priorityIncidents: incidents.filter(
            (incident) =>
              ["high", "critical"].includes(incident.priority) &&
              !["resolved", "closed"].includes(incident.status),
          ).length,
          projectsAtRisk: projects.filter(
            (project) =>
              project.status === "active" &&
              project.health !== "on_track",
          ).length,
        }}
      />
    );
  } else if (activeModule === "analitica") {
    content = (
      <ControlCenter
        onNavigate={navigate}
        projects={projects}
        tasks={tasks}
        incidents={incidents}
        people={people}
        leaveRequests={leaveRequests}
        treasuryEntries={treasuryEntries}
        payrollRuns={payrollRuns}
        integrationRuns={integrationRuns}
        integrationConnectors={integrationConnectors}
        serviceDimensions={analyticsServiceDimensions}
        savedViews={savedAnalyticsViews}
        onLoadSnapshot={loadAnalyticsSnapshotAction}
        referenceDate={summaryAnchor}
        onSaveView={(view) =>
          performAction(
            () =>
              saveAnalyticsViewAction({
                name: view.name,
                filters: {
                  period:
                    view.filters.period === "30d" ||
                    view.filters.period === "90d" ||
                    view.filters.period === "6m" ||
                    view.filters.period === "12m"
                      ? view.filters.period
                      : "all",
                  comparison:
                    view.filters.comparison === "none"
                      ? "none"
                      : "previous_period",
                  projectId: view.filters.projectId ?? null,
                  team: view.filters.team ?? null,
                  ownerId: view.filters.ownerId ?? null,
                  status: view.filters.status ?? null,
                  service: view.filters.service ?? null,
                },
              }),
            "Vista analítica guardada",
          )
        }
      />
    );
  } else if (activeModule === "vacaciones") {
    content = (
      <VacationsWorkspace
        requests={leaveRequests}
        events={leaveEvents}
        pending={pending}
        loadError={leaveLoadError}
        onCreate={(input: LeaveRequestInput) => {
          return performAction(
            () => createLeaveRequestAction(input),
            "Solicitud enviada",
          );
        }}
        onTransition={(
          requestId: string,
          status: LeaveRequestStatus,
          note: string,
        ) => {
          if (
            !["submitted", "approved", "rejected", "cancelled"].includes(
              status,
            )
          ) {
            return false;
          }
          return performAction(
            () =>
              transitionLeaveRequestAction({
                requestId,
                status: status as
                  | "submitted"
                  | "approved"
                  | "rejected"
                  | "cancelled",
                note,
              }),
            "Solicitud actualizada",
          );
        }}
      />
    );
  } else if (activeModule === "tareas") {
    content = (
      <TasksWorkspace
        tasks={tasks}
        dependencies={taskDependencies}
        comments={taskComments}
        events={taskEvents}
        projectOptions={projects.map(({ id, name }) => ({ id, name }))}
        assigneeOptions={taskAssignees}
        currentUserName={currentUserName}
        referenceDate={scenarioAnchorDate}
        pending={pending}
        loadError={taskLoadError}
        onCreate={(input: TaskInput) =>
          performAction(() => createTaskAction(input), "Tarea creada")
        }
        onUpdate={(taskId: string, input: TaskInput) =>
          performAction(
            () => updateTaskAction(taskId, input),
            "Tarea actualizada",
          )
        }
        onTransition={(taskId: string, status: TaskStatus, note: string) =>
          performAction(
            () => transitionTaskAction({ taskId, status, note }),
            "Estado actualizado",
          )
        }
        onComment={(taskId: string, body: string) =>
          performAction(
            () => addTaskCommentAction({ taskId, body }),
            "Comentario añadido",
          )
        }
        onDependency={(taskId: string, dependsOnTaskId: string) =>
          performAction(
            () => addTaskDependencyAction({ taskId, dependsOnTaskId }),
            "Dependencia añadida",
          )
        }
      />
    );
  } else if (activeModule === "incidencias") {
    content = <IncidentsWorkspace incidents={incidents} events={incidentEvents} assigneeOptions={incidentAssignees} projectOptions={projects.map(({ id, name }) => ({ id, name }))} referenceDate={`${scenarioAnchorDate}T12:00:00.000Z`} pending={pending} loadError={incidentLoadError} onCreate={(input: IncidentInput) => performAction(() => createIncidentAction(input), "Incidencia registrada")} onUpdate={(id: string, input: IncidentInput) => performAction(() => updateIncidentAction(id, input), "Incidencia actualizada")} onTransition={(id: string, status: IncidentStatus, note: string) => performAction(() => transitionIncidentAction({ incidentId: id, status, note }), "Estado actualizado")} />;
  } else if (activeModule === "proyectos") {
    content = <ProjectsWorkspace projects={projects} events={projectEvents} people={people} tasks={tasks} incidents={incidents} pending={pending} loadError={projectsLoadError} canManage={canManageProjects} onCreate={(input: ProjectInput) => performAction(() => createProjectAction(input), "Proyecto creado")} onUpdate={(id: string, input: ProjectInput) => performAction(() => updateProjectAction(id, input), "Proyecto actualizado")} />;
  } else if (activeModule === "personal") {
    content = (
      <>
        <PeopleWorkspace people={people} events={peopleEvents} leaveRequests={leaveRequests} referenceDate={scenarioAnchorDate} pending={pending} loadError={peopleLoadError} onCreate={(input: PersonInput) => performAction(() => createPersonAction(input), "Perfil añadido")} onUpdate={(id: string, input: PersonInput) => performAction(() => updatePersonAction(id, input), "Perfil actualizado")} />
        <IntegrationsCenter connectors={integrationConnectors} runs={integrationRuns} issues={dataQualityIssues} kind="people" pending={pending} canManage={canManageIntegrations} onSimulate={(connectorId) => performAction(() => simulateIntegrationAction(connectorId), "Sincronización completada")} />
      </>
    );
  } else if (activeModule === "novedades") {
    content = <ChangelogWorkspace entries={changelogEntries} events={changelogEvents} pending={pending} loadError={changelogLoadError} canManage={canManageChangelog} onCreate={(input: ChangelogInput) => performAction(() => createChangelogAction(input), "Borrador creado")} onUpdate={(id: string, input: ChangelogInput) => performAction(() => updateChangelogAction(id, input), "Novedad actualizada")} onTransition={(id: string, status: ChangelogStatus, note: string) => performAction(() => transitionChangelogAction({ entryId: id, status, note }), status === "published" ? "Novedad publicada" : "Flujo actualizado")} />;
  } else if (activeModule === "tesoreria") {
    content = (
      <>
        <TreasuryWorkspace entries={treasuryEntries} events={treasuryEvents} pending={pending} loadError={treasuryLoadError} canManage={canManageTreasury} onCreate={(input: TreasuryInput) => performAction(() => createTreasuryAction(input), "Borrador creado")} onUpdate={(id: string, input: TreasuryInput) => performAction(() => updateTreasuryAction(id, input), "Borrador actualizado")} onTransition={(id: string, status: TreasuryStatus, note: string) => performAction(() => transitionTreasuryAction(id, status, note), "Control de Tesorería registrado")} />
        <IntegrationsCenter connectors={integrationConnectors} runs={integrationRuns} issues={dataQualityIssues} kind="financial" pending={pending} canManage={canManageIntegrations} onSimulate={(connectorId) => performAction(() => simulateIntegrationAction(connectorId), "Importación completada")} />
      </>
    );
  } else if (activeModule === "nominas") {
    content = (
      <>
        <PayrollWorkspace runs={payrollRuns} participants={payrollParticipants} events={payrollEvents} pending={pending} loadError={payrollLoadError} canManage={canManagePayroll} onCreate={(input: PayrollInput) => performAction(() => createPayrollAction(input), "Ciclo creado")} onUpdate={(id: string, input: PayrollInput) => performAction(() => updatePayrollAction(id, input), "Recopilación agregada actualizada")} onTransition={(id: string, status: PayrollStatus, note: string) => performAction(() => transitionPayrollAction(id, status, note), "Control de Nóminas registrado")} />
        <IntegrationsCenter connectors={integrationConnectors} runs={integrationRuns} issues={dataQualityIssues} kind="payroll" pending={pending} canManage={canManageIntegrations} onSimulate={(connectorId) => performAction(() => simulateIntegrationAction(connectorId), "Sincronización agregada completada")} />
      </>
    );
  } else if (activeModule === "configuracion") {
    content = canManageSettings ? <SettingsWorkspace organizationName={localName} configuration={workspaceConfiguration} moduleSettings={moduleSettings} roles={roles} memberships={memberships} invitations={invitations} auditEvents={adminAuditEvents} pending={pending} loadError={settingsLoadError} onRenameOrganization={(name: string) => performAction(() => renameOrganizationAction(name), "Identidad actualizada").then((ok) => { if (ok) setLocalName(name); return ok; })} onUpdateConfiguration={(configuration) => performAction(() => updateWorkspaceConfigurationAction(configuration), "Políticas actualizadas")} onUpdateModule={(moduleId: ModuleId, enabled: boolean, sortOrder: number) => performAction(() => updateModuleSettingAction({ moduleId, enabled, sortOrder }), "Módulo actualizado")} onUpdateRoleMetadata={(roleId: string, name: string, color: string) => performAction(() => updateRoleMetadataAction(roleId, name, color), "Rol actualizado")} onUpdateRolePermissions={(roleId: string, permissions: PermissionCode[]) => performAction(() => updateRolePermissionsAction(roleId, permissions), "Permisos actualizados")} onCreateInvitation={(email: string, roleId: string) => performAction(() => createInvitationAction(email, roleId), "Invitación creada sin envío externo")} onUpdateMembership={(membershipId: string, roleId: string, status: WorkspaceMembershipStatus) => performAction(() => updateMembershipAction(membershipId, roleId, status), "Acceso actualizado")} onRestoreDataset={() => performAction(() => restoreDemoScenarioV6Action(), "Datos restablecidos")} /> : <main className="workspace" id="main-content"><div className="page-heading"><div><p className="eyebrow">Administración</p><h1>Configuración</h1><p className="lede">Tu rol no permite realizar cambios administrativos en esta organización.</p></div></div><div className="inline-alert" role="status"><strong>Configuración en modo lectura.</strong><span>Solicita el permiso estable <code>settings.workspace.manage</code> a una persona administradora.</span></div></main>;
  } else {
    content = (
      <ModuleWorkspace
        moduleId={activeModule}
        organizationName={localName}
        onRenameOrganization={(name) => {
          setLocalName(name);
          toast.info(
            "El guardado persistente se activará al provisionar Supabase.",
          );
        }}
      />
    );
  }

  return (
    <>
      <ThemePreferencesSync
        theme={theme}
        density={density}
        reducedMotion={reducedMotion}
        highContrast={highContrast}
      />
      <AppShell
        activeModule={activeModule}
        organizationName={localName}
        mode="authenticated"
        onNavigate={navigate}
        avatarUrl={avatarUrl}
        displayName={displayName}
      >
        <div aria-busy={pending}>
          {workspaceLoadError ? (
            <div className="inline-alert" role="status">
              <strong>Los datos disponibles se han cargado.</strong>
              <span>{workspaceLoadError}</span>
            </div>
          ) : null}
          {content}
        </div>
      </AppShell>
      <Toaster position="bottom-right" richColors />
    </>
  );
}
