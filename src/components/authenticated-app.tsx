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
import { createChangelogAction, transitionChangelogAction, updateChangelogAction } from "@/app/app/changelog-actions";
import { createInvitationAction, renameOrganizationAction, updateMembershipAction, updateModuleSettingAction, updateRoleMetadataAction, updateRolePermissionsAction } from "@/app/app/settings-actions";
import { createTreasuryAction, transitionTreasuryAction, updateTreasuryAction } from "@/app/app/treasury-actions";
import { createPayrollAction, transitionPayrollAction, updatePayrollAction } from "@/app/app/payroll-actions";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { IncidentsWorkspace } from "@/components/incidents-workspace";
import { ChangelogWorkspace } from "@/components/changelog-workspace";
import { ModuleWorkspace } from "@/components/module-workspace";
import { PeopleWorkspace } from "@/components/people-workspace";
import { SettingsWorkspace } from "@/components/settings-workspace";
import { TasksWorkspace } from "@/components/tasks-workspace";
import { TreasuryWorkspace } from "@/components/treasury-workspace";
import { PayrollWorkspace } from "@/components/payroll-workspace";
import { VacationsWorkspace } from "@/components/vacations-workspace";
import type { ModuleId } from "@/domain/modules";
import type { ChangelogEntry, ChangelogEvent, ChangelogInput, ChangelogStatus } from "@/domain/changelog";
import type { PermissionCode } from "@/domain/permissions";
import type { AdminAuditEvent, ConfigurableRole, ModuleSetting, WorkspaceInvitation, WorkspaceMembership, WorkspaceMembershipStatus } from "@/domain/settings";
import type { Incident, IncidentEvent, IncidentInput, IncidentStatus } from "@/domain/incidents";
import type { Person, PersonEvent, PersonInput } from "@/domain/people";
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
import type { PayrollEvent, PayrollInput, PayrollRun, PayrollStatus } from "@/domain/payroll";

type AuthenticatedAppProps = {
  activeModule: ModuleId;
  organizationName: string;
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
  changelogEntries?: ChangelogEntry[];
  changelogEvents?: ChangelogEvent[];
  changelogLoadError?: string;
  canManageChangelog?: boolean;
  treasuryEntries?: TreasuryEntry[];
  treasuryEvents?: TreasuryEvent[];
  treasuryLoadError?: string;
  canManageTreasury?: boolean;
  payrollRuns?: PayrollRun[];
  payrollEvents?: PayrollEvent[];
  payrollLoadError?: string;
  canManagePayroll?: boolean;
  moduleSettings?: ModuleSetting[];
  roles?: ConfigurableRole[];
  memberships?: WorkspaceMembership[];
  invitations?: WorkspaceInvitation[];
  adminAuditEvents?: AdminAuditEvent[];
  settingsLoadError?: string;
  canManageSettings?: boolean;
};

export function AuthenticatedApp({
  activeModule,
  organizationName,
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
  changelogEntries = [],
  changelogEvents = [],
  changelogLoadError,
  canManageChangelog = false,
  treasuryEntries = [],
  treasuryEvents = [],
  treasuryLoadError,
  canManageTreasury = false,
  payrollRuns = [],
  payrollEvents = [],
  payrollLoadError,
  canManagePayroll = false,
  moduleSettings = [],
  roles = [],
  memberships = [],
  invitations = [],
  adminAuditEvents = [],
  settingsLoadError,
  canManageSettings = false,
}: AuthenticatedAppProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localName, setLocalName] = useState(organizationName);

  function performAction(
    action: () => Promise<ActionResult>,
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
    content = <Dashboard onNavigate={navigate} />;
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
        assigneeOptions={taskAssignees}
        currentUserName={currentUserName}
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
    content = <IncidentsWorkspace incidents={incidents} events={incidentEvents} assigneeOptions={incidentAssignees} pending={pending} loadError={incidentLoadError} onCreate={(input: IncidentInput) => performAction(() => createIncidentAction(input), "Incidencia registrada")} onUpdate={(id: string, input: IncidentInput) => performAction(() => updateIncidentAction(id, input), "Incidencia actualizada")} onTransition={(id: string, status: IncidentStatus, note: string) => performAction(() => transitionIncidentAction({ incidentId: id, status, note }), "Estado actualizado")} />;
  } else if (activeModule === "personal") {
    content = <PeopleWorkspace people={people} events={peopleEvents} leaveRequests={leaveRequests} pending={pending} loadError={peopleLoadError} onCreate={(input: PersonInput) => performAction(() => createPersonAction(input), "Perfil añadido")} onUpdate={(id: string, input: PersonInput) => performAction(() => updatePersonAction(id, input), "Perfil actualizado")} />;
  } else if (activeModule === "novedades") {
    content = <ChangelogWorkspace entries={changelogEntries} events={changelogEvents} pending={pending} loadError={changelogLoadError} canManage={canManageChangelog} onCreate={(input: ChangelogInput) => performAction(() => createChangelogAction(input), "Borrador creado")} onUpdate={(id: string, input: ChangelogInput) => performAction(() => updateChangelogAction(id, input), "Novedad actualizada")} onTransition={(id: string, status: ChangelogStatus, note: string) => performAction(() => transitionChangelogAction({ entryId: id, status, note }), status === "published" ? "Novedad publicada" : "Flujo actualizado")} />;
  } else if (activeModule === "tesoreria") {
    content = <TreasuryWorkspace entries={treasuryEntries} events={treasuryEvents} pending={pending} loadError={treasuryLoadError} canManage={canManageTreasury} onCreate={(input: TreasuryInput) => performAction(() => createTreasuryAction(input), "Borrador sintético creado")} onUpdate={(id: string, input: TreasuryInput) => performAction(() => updateTreasuryAction(id, input), "Borrador actualizado")} onTransition={(id: string, status: TreasuryStatus, note: string) => performAction(() => transitionTreasuryAction(id, status, note), "Control de Tesorería registrado")} />;
  } else if (activeModule === "nominas") {
    content = <PayrollWorkspace runs={payrollRuns} events={payrollEvents} pending={pending} loadError={payrollLoadError} canManage={canManagePayroll} onCreate={(input: PayrollInput) => performAction(() => createPayrollAction(input), "Ciclo sintético creado")} onUpdate={(id: string, input: PayrollInput) => performAction(() => updatePayrollAction(id, input), "Recopilación agregada actualizada")} onTransition={(id: string, status: PayrollStatus, note: string) => performAction(() => transitionPayrollAction(id, status, note), "Control de Nóminas registrado")} />;
  } else if (activeModule === "configuracion") {
    content = canManageSettings ? <SettingsWorkspace organizationName={localName} moduleSettings={moduleSettings} roles={roles} memberships={memberships} invitations={invitations} auditEvents={adminAuditEvents} pending={pending} loadError={settingsLoadError} onRenameOrganization={(name: string) => performAction(() => renameOrganizationAction(name), "Identidad actualizada").then((ok) => { if (ok) setLocalName(name); return ok; })} onUpdateModule={(moduleId: ModuleId, enabled: boolean, sortOrder: number) => performAction(() => updateModuleSettingAction({ moduleId, enabled, sortOrder }), "Módulo actualizado")} onUpdateRoleMetadata={(roleId: string, name: string, color: string) => performAction(() => updateRoleMetadataAction(roleId, name, color), "Rol actualizado")} onUpdateRolePermissions={(roleId: string, permissions: PermissionCode[]) => performAction(() => updateRolePermissionsAction(roleId, permissions), "Permisos actualizados")} onCreateInvitation={(email: string, roleId: string) => performAction(() => createInvitationAction(email, roleId), "Invitación creada sin envío externo")} onUpdateMembership={(membershipId: string, roleId: string, status: WorkspaceMembershipStatus) => performAction(() => updateMembershipAction(membershipId, roleId, status), "Acceso actualizado")} /> : <main className="workspace" id="main-content"><div className="page-heading"><div><p className="eyebrow">Administración</p><h1>Configuración</h1><p className="lede">Tu rol no permite realizar cambios administrativos en esta organización.</p></div></div><div className="inline-alert" role="status"><strong>Configuración en modo lectura.</strong><span>Solicita el permiso estable <code>settings.workspace.manage</code> a una persona administradora.</span></div></main>;
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
      <AppShell
        activeModule={activeModule}
        organizationName={localName}
        mode="authenticated"
        onNavigate={navigate}
      >
        <div aria-busy={pending}>{content}</div>
      </AppShell>
      <Toaster position="bottom-right" richColors />
    </>
  );
}
