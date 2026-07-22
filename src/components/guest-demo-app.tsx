"use client";

import dynamic from "next/dynamic";
import { useEffect, useReducer, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import {
  guestDemoReducer,
  initialGuestDemoState,
  parseGuestDemoState,
  type GuestDemoState,
} from "@/domain/guest-demo";
import type { ModuleId } from "@/domain/modules";
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
const ModuleWorkspace = dynamic(
  () =>
    import("@/components/module-workspace").then(
      (module) => module.ModuleWorkspace,
    ),
  { loading: () => <WorkspaceLoading /> },
);
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

  function content() {
    if (!ready) return <WorkspaceLoading />;

    if (state.activeModule === "inicio") {
      return <Dashboard onNavigate={navigate} />;
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
          onCreate={createTask}
          onUpdate={updateTask}
          onTransition={transitionTask}
          onComment={addTaskComment}
          onDependency={addTaskDependency}
        />
      );
    }

    return (
      <ModuleWorkspace
        moduleId={
          state.activeModule as Exclude<
            ModuleId,
            "inicio" | "vacaciones" | "tareas"
          >
        }
        organizationName={state.organizationName}
        onRenameOrganization={(name) => {
          dispatch({ type: "rename-organization", name });
          notify("Nombre actualizado en esta sesión");
        }}
      />
    );
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
