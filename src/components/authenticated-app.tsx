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
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { ModuleWorkspace } from "@/components/module-workspace";
import { TasksWorkspace } from "@/components/tasks-workspace";
import { VacationsWorkspace } from "@/components/vacations-workspace";
import type { ModuleId } from "@/domain/modules";
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
