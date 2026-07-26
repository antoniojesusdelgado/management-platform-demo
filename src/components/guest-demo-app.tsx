"use client";

import dynamic from "next/dynamic";
import { useEffect, useReducer, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { ControlCenter } from "@/components/control-center";
import { IntegrationsCenter } from "@/components/integrations-center";
import { ModuleAnalytics } from "@/components/module-analytics";
import {
  guestDemoReducer,
  initialGuestDemoState,
  parseGuestDemoState,
  type GuestDemoState,
} from "@/domain/guest-demo";
import type { ModuleId } from "@/domain/modules";
import { canTransitionChangelog, type ChangelogInput, type ChangelogStatus } from "@/domain/changelog";
import type { PermissionCode } from "@/domain/permissions";
import type { WorkspaceMembershipStatus } from "@/domain/settings";
import { canTransitionIncident, type IncidentInput, type IncidentStatus } from "@/domain/incidents";
import type { PersonInput } from "@/domain/people";
import type { ProjectInput } from "@/domain/projects";
import type { SavedAnalyticsView } from "@/domain/integrations";
import { canTransitionPayroll, type PayrollInput, type PayrollStatus } from "@/domain/payroll";
import { canTransitionTreasury, type TreasuryInput, type TreasuryStatus } from "@/domain/treasury";
import {
  canTransitionTask,
  createsTaskDependencyCycle,
  type TaskInput,
  type TaskStatus,
} from "@/domain/tasks";
import type {
  LeaveRequestInput,
  LeaveRequestStatus,
} from "@/domain/vacations";

const STORAGE_KEY = "management-platform-demo:v1";
const VacationsWorkspace = dynamic(
  () =>
    import("@/components/vacations-workspace").then(
      (module) => module.VacationsWorkspace,
    ),
  { loading: () => <WorkspaceLoading /> },
);
const TasksWorkspace = dynamic(
  () =>
    import("@/components/tasks-workspace").then(
      (module) => module.TasksWorkspace,
    ),
  { loading: () => <WorkspaceLoading /> },
);
const IncidentsWorkspace = dynamic(
  () => import("@/components/incidents-workspace").then((module) => module.IncidentsWorkspace),
  { loading: () => <WorkspaceLoading /> },
);
const PeopleWorkspace = dynamic(
  () => import("@/components/people-workspace").then((module) => module.PeopleWorkspace),
  { loading: () => <WorkspaceLoading /> },
);
const ChangelogWorkspace = dynamic(
  () => import("@/components/changelog-workspace").then((module) => module.ChangelogWorkspace),
  { loading: () => <WorkspaceLoading /> },
);
const SettingsWorkspace = dynamic(
  () => import("@/components/settings-workspace").then((module) => module.SettingsWorkspace),
  { loading: () => <WorkspaceLoading /> },
);
const TreasuryWorkspace = dynamic(
  () => import("@/components/treasury-workspace").then((module) => module.TreasuryWorkspace),
  { loading: () => <WorkspaceLoading /> },
);
const PayrollWorkspace = dynamic(
  () => import("@/components/payroll-workspace").then((module) => module.PayrollWorkspace),
  { loading: () => <WorkspaceLoading /> },
);
const ProjectsWorkspace = dynamic(
  () =>
    import("@/components/projects-workspace").then(
      (module) => module.ProjectsWorkspace,
    ),
  { loading: () => <WorkspaceLoading /> },
);

type StoredStateResult = {
  state: GuestDemoState;
  warning?: string;
};

function WorkspaceLoading() {
  return (
    <main className="workspace workspace-loading" id="main-content" aria-busy="true">
      <span className="skeleton skeleton-title" />
      <span className="skeleton skeleton-copy" />
      <div className="cards-grid">
        <span className="skeleton skeleton-card" />
        <span className="skeleton skeleton-card" />
        <span className="skeleton skeleton-card" />
      </div>
      <span className="sr-only">Cargando módulo</span>
    </main>
  );
}

function readStoredState(): StoredStateResult {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return { state: initialGuestDemoState };
    const parsed = parseGuestDemoState(JSON.parse(stored));
    if (!parsed) {
      return {
        state: initialGuestDemoState,
        warning: "La sesión guardada no era válida y se ha restaurado la demo.",
      };
    }
    return { state: parsed };
  } catch {
    return {
      state: initialGuestDemoState,
      warning: "El almacenamiento de sesión no está disponible; la demo seguirá en memoria.",
    };
  }
}

export function GuestDemoApp() {
  const [state, dispatch] = useReducer(
    guestDemoReducer,
    initialGuestDemoState,
  );
  const hydrated = useRef(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    const stored = readStoredState();
    queueMicrotask(() => {
      dispatch({ type: "hydrate", state: stored.state });
      if (stored.warning) {
        setNotice(stored.warning);
        setStorageAvailable(false);
      }
      hydrated.current = true;
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated.current && storageAvailable) {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        queueMicrotask(() => {
          setStorageAvailable(false);
          setNotice(
            "No se pudieron guardar los cambios; permanecerán solo mientras esta página siga abierta.",
          );
        });
      }
    }
  }, [state, storageAvailable]);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  function notify(message: string) {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 3_500);
  }

  function navigate(module: ModuleId) {
    if (!ready) return;
    dispatch({ type: "navigate", module });
  }

  function createLeave(input: LeaveRequestInput) {
    if (!ready) return false;
    dispatch({ type: "create-leave", input });
    notify("Solicitud registrada en esta sesión");
    return true;
  }

  function transitionLeave(
    requestId: string,
    status: LeaveRequestStatus,
    note: string,
  ) {
    if (!ready) return false;
    dispatch({ type: "transition-leave", requestId, status, note });
    const messages: Record<LeaveRequestStatus, string> = {
      draft: "Solicitud guardada como borrador",
      submitted: "Solicitud enviada a revisión",
      approved: "Solicitud aprobada",
      rejected: "Solicitud rechazada",
      cancelled: "Solicitud cancelada",
    };
    notify(messages[status]);
    return true;
  }

  function createTask(input: TaskInput) {
    if (!ready) return false;
    dispatch({ type: "create-task", input });
    notify("Tarea creada en esta sesión");
    return true;
  }

  function updateTask(taskId: string, input: TaskInput) {
    if (!ready || !state.tasks.some((task) => task.id === taskId)) return false;
    dispatch({ type: "update-task", taskId, input });
    notify("Tarea actualizada");
    return true;
  }

  function transitionTask(taskId: string, status: TaskStatus, note: string) {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!ready || !task || !canTransitionTask(task.status, status)) return false;
    dispatch({ type: "transition-task", taskId, status, note });
    notify("Estado de la tarea actualizado");
    return true;
  }

  function addTaskComment(taskId: string, body: string) {
    if (!ready || body.trim().length < 2) return false;
    dispatch({ type: "add-task-comment", taskId, body });
    notify("Comentario añadido");
    return true;
  }

  function addTaskDependency(taskId: string, dependsOnTaskId: string) {
    if (
      !ready ||
      createsTaskDependencyCycle(
        state.taskDependencies,
        taskId,
        dependsOnTaskId,
      )
    ) {
      notify("La dependencia crearía un ciclo y no se ha guardado");
      return false;
    }
    dispatch({ type: "add-task-dependency", taskId, dependsOnTaskId });
    notify("Dependencia añadida");
    return true;
  }

  function createIncident(input: IncidentInput) {
    if (!ready) return false;
    dispatch({ type: "create-incident", input });
    notify("Incidencia registrada en esta sesión");
    return true;
  }

  function updateIncident(incidentId: string, input: IncidentInput) {
    if (!ready || !state.incidents.some((item) => item.id === incidentId)) return false;
    dispatch({ type: "update-incident", incidentId, input });
    notify("Incidencia actualizada");
    return true;
  }

  function transitionIncident(incidentId: string, status: IncidentStatus, note: string) {
    const incident = state.incidents.find((item) => item.id === incidentId);
    if (!ready || !incident || !canTransitionIncident(incident.status, status) || (status === "assigned" && !incident.assigneeName)) return false;
    dispatch({ type: "transition-incident", incidentId, status, note });
    notify("Estado de la incidencia actualizado");
    return true;
  }

  function createPerson(input: PersonInput) {
    if (!ready) return false;
    dispatch({ type: "create-person", input });
    notify("Perfil sintético añadido");
    return true;
  }

  function updatePerson(personId: string, input: PersonInput) {
    if (!ready || !state.people.some((person) => person.id === personId)) return false;
    dispatch({ type: "update-person", personId, input });
    notify("Perfil actualizado");
    return true;
  }

  function createProject(input: ProjectInput) {
    if (!ready || state.projects.some((project) => project.code === input.code)) {
      return false;
    }
    dispatch({ type: "create-project", input });
    notify("Proyecto creado en esta sesión");
    return true;
  }

  function updateProject(projectId: string, input: ProjectInput) {
    if (!ready || !state.projects.some((project) => project.id === projectId)) {
      return false;
    }
    dispatch({ type: "update-project", projectId, input });
    notify("Proyecto actualizado");
    return true;
  }

  function createChangelog(input: ChangelogInput) { if (!ready || state.changelogEntries.some((entry) => entry.version === input.version)) return false; dispatch({ type: "create-changelog", input }); notify("Borrador creado"); return true; }
  function updateChangelog(entryId: string, input: ChangelogInput) { if (!ready) return false; dispatch({ type: "update-changelog", entryId, input }); notify("Novedad actualizada"); return true; }
  function transitionChangelog(entryId: string, status: ChangelogStatus, note: string) { const entry = state.changelogEntries.find((item) => item.id === entryId); if (!ready || !entry || !canTransitionChangelog(entry.status, status)) return false; dispatch({ type: "transition-changelog", entryId, status, note }); notify(status === "published" ? "Novedad publicada" : "Flujo editorial actualizado"); return true; }
  function updateModuleSetting(moduleId: ModuleId, enabled: boolean, sortOrder: number) { if (!ready) return false; dispatch({ type: "update-module-setting", moduleId, enabled, sortOrder }); notify("Configuración del módulo actualizada"); return true; }
  function updateRoleMetadata(roleId: string, name: string, color: string) { if (!ready) return false; dispatch({ type: "update-role-metadata", roleId, name, color }); notify("Metadatos del rol actualizados"); return true; }
  function updateRolePermissions(roleId: string, permissionCodes: PermissionCode[]) { if (!ready) return false; dispatch({ type: "update-role-permissions", roleId, permissionCodes }); notify("Permisos del rol actualizados"); return true; }
  function createInvitation(email: string, roleId: string) { if (!ready) return false; dispatch({ type: "create-invitation", email, roleId }); notify("Invitación sintética creada"); return true; }
  function updateMembership(membershipId: string, roleId: string, status: WorkspaceMembershipStatus) { if (!ready) return false; dispatch({ type: "update-membership", membershipId, roleId, status }); notify("Acceso actualizado"); return true; }
  function createTreasury(input: TreasuryInput) { if (!ready) return false; dispatch({ type: "create-treasury", input }); notify("Borrador sintético creado"); return true; }
  function updateTreasury(entryId: string, input: TreasuryInput) { const entry = state.treasuryEntries.find((item) => item.id === entryId); if (!ready || !entry || entry.status !== "draft") return false; dispatch({ type: "update-treasury", entryId, input }); notify("Borrador actualizado"); return true; }
  function transitionTreasury(entryId: string, status: TreasuryStatus, note: string) { const entry = state.treasuryEntries.find((item) => item.id === entryId); if (!ready || !entry || !canTransitionTreasury(entry.status, status) || note.trim().length < 3) return false; dispatch({ type: "transition-treasury", entryId, status, note }); notify("Control de Tesorería registrado"); return true; }
  function createPayroll(input: PayrollInput) { if (!ready || state.payrollRuns.some((run) => run.periodStart === input.periodStart && run.periodEnd === input.periodEnd)) return false; dispatch({ type: "create-payroll", input }); notify("Ciclo sintético creado"); return true; }
  function updatePayroll(runId: string, input: PayrollInput) { const run = state.payrollRuns.find((item) => item.id === runId); if (!ready || !run || run.status !== "collecting") return false; dispatch({ type: "update-payroll", runId, input }); notify("Recopilación agregada actualizada"); return true; }
  function transitionPayroll(runId: string, status: PayrollStatus, note: string) { const run = state.payrollRuns.find((item) => item.id === runId); if (!ready || !run || !canTransitionPayroll(run.status, status) || note.trim().length < 3) return false; dispatch({ type: "transition-payroll", runId, status, note }); notify("Control de Nóminas registrado"); return true; }
  function simulateIntegration(connectorId: string) {
    if (!ready || !state.integrationConnectors.some(({ id }) => id === connectorId)) return false;
    dispatch({ type: "simulate-integration", connectorId });
    notify("Ejecución sintética completada en esta sesión");
    return true;
  }
  function saveAnalyticsView(view: SavedAnalyticsView) {
    if (!ready) return false;
    dispatch({ type: "save-analytics-view", view });
    notify("Vista analítica guardada en esta sesión");
    return true;
  }

  function content() {
    if (!ready) return <WorkspaceLoading />;

    if (state.activeModule === "inicio") {
      return <Dashboard onNavigate={navigate} />;
    }

    if (state.activeModule === "centro-control") {
      return (
        <ControlCenter
          projects={state.projects}
          tasks={state.tasks}
          incidents={state.incidents}
          people={state.people}
          leaveRequests={state.leaveRequests}
          treasuryEntries={state.treasuryEntries}
          savedViews={state.savedAnalyticsViews}
          onSaveView={saveAnalyticsView}
        />
      );
    }

    if (state.activeModule === "vacaciones") {
      return (
        <VacationsWorkspace
          requests={state.leaveRequests}
          events={state.leaveEvents}
          onCreate={createLeave}
          onTransition={transitionLeave}
        />
      );
    }

    if (state.activeModule === "tareas") {
      return (
        <TasksWorkspace
          tasks={state.tasks}
          dependencies={state.taskDependencies}
          comments={state.taskComments}
          events={state.taskEvents}
          projectOptions={state.projects.map(({ id, name }) => ({ id, name }))}
          onCreate={createTask}
          onUpdate={updateTask}
          onTransition={transitionTask}
          onComment={addTaskComment}
          onDependency={addTaskDependency}
        />
      );
    }

    if (state.activeModule === "proyectos") {
      return (
        <ProjectsWorkspace
          projects={state.projects}
          events={state.projectEvents}
          people={state.people}
          tasks={state.tasks}
          incidents={state.incidents}
          onCreate={createProject}
          onUpdate={updateProject}
        />
      );
    }

    if (state.activeModule === "incidencias") {
      return <IncidentsWorkspace incidents={state.incidents} events={state.incidentEvents} assigneeOptions={state.people.filter((person) => person.status === "active").map((person) => person.displayName)} projectOptions={state.projects.map(({ id, name }) => ({ id, name }))} onCreate={createIncident} onUpdate={updateIncident} onTransition={transitionIncident} />;
    }

    if (state.activeModule === "personal") {
      return (
        <>
          <PeopleWorkspace people={state.people} events={state.peopleEvents} leaveRequests={state.leaveRequests} onCreate={createPerson} onUpdate={updatePerson} />
          <IntegrationsCenter connectors={state.integrationConnectors} runs={state.integrationRuns} issues={state.dataQualityIssues} kind="people" onSimulate={simulateIntegration} />
        </>
      );
    }

    if (state.activeModule === "novedades") {
      return <ChangelogWorkspace entries={state.changelogEntries} events={state.changelogEvents} onCreate={createChangelog} onUpdate={updateChangelog} onTransition={transitionChangelog} />;
    }

    if (state.activeModule === "tesoreria") {
      return (
        <>
          <TreasuryWorkspace entries={state.treasuryEntries} events={state.treasuryEvents} onCreate={createTreasury} onUpdate={updateTreasury} onTransition={transitionTreasury} />
          <IntegrationsCenter connectors={state.integrationConnectors} runs={state.integrationRuns} issues={state.dataQualityIssues} kind="financial" onSimulate={simulateIntegration} />
        </>
      );
    }

    if (state.activeModule === "nominas") {
      return (
        <>
          <PayrollWorkspace runs={state.payrollRuns} events={state.payrollEvents} onCreate={createPayroll} onUpdate={updatePayroll} onTransition={transitionPayroll} />
          <IntegrationsCenter connectors={state.integrationConnectors} runs={state.integrationRuns} issues={state.dataQualityIssues} kind="payroll" onSimulate={simulateIntegration} />
        </>
      );
    }

    if (state.activeModule === "configuracion") {
      return <SettingsWorkspace organizationName={state.organizationName} moduleSettings={state.moduleSettings} roles={state.roles} memberships={state.memberships} invitations={state.invitations} auditEvents={state.adminAuditEvents} onRenameOrganization={(name) => { dispatch({ type: "rename-organization", name }); notify("Identidad actualizada"); return true; }} onUpdateModule={updateModuleSetting} onUpdateRoleMetadata={updateRoleMetadata} onUpdateRolePermissions={updateRolePermissions} onCreateInvitation={createInvitation} onUpdateMembership={updateMembership} />;
    }

    return null;
  }

  return (
    <div data-demo-ready={ready}>
      <a className="sr-only" href="#main-content">
        Saltar al contenido
      </a>
      <AppShell
        activeModule={state.activeModule}
        organizationName={state.organizationName}
        mode="guest"
        onNavigate={navigate}
        onReset={() => {
          dispatch({ type: "reset" });
          if (storageAvailable) {
            try {
              window.sessionStorage.removeItem(STORAGE_KEY);
            } catch {
              setStorageAvailable(false);
            }
          }
          notify("Datos de demostración restaurados");
        }}
      >
        {content()}
        {ready ? (
          <ModuleAnalytics
            moduleId={state.activeModule}
            projects={state.projects}
            tasks={state.tasks}
            incidents={state.incidents}
            people={state.people}
            leaveRequests={state.leaveRequests}
            treasuryEntries={state.treasuryEntries}
            payrollRuns={state.payrollRuns}
            changelogEntries={state.changelogEntries}
          />
        ) : null}
      </AppShell>
      <div
        className="local-toast"
        role="status"
        aria-live="polite"
        hidden={!notice}
      >
        {notice}
      </div>
    </div>
  );
}
