"use client";

import dynamic from "next/dynamic";
import { useEffect, useReducer, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import {
  guestDemoReducer,
  initialGuestDemoState,
  type GuestDemoState,
} from "@/domain/guest-demo";
import type { ModuleId } from "@/domain/modules";
import type {
  LeaveRequestInput,
  LeaveRequestStatus,
} from "@/domain/vacations";

const STORAGE_KEY = "management-platform-demo:v1";
const ModuleWorkspace = dynamic(() =>
  import("@/components/module-workspace").then(
    (module) => module.ModuleWorkspace,
  ),
);
const VacationsWorkspace = dynamic(() =>
  import("@/components/vacations-workspace").then(
    (module) => module.VacationsWorkspace,
  ),
);

function readStoredState(): GuestDemoState {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return initialGuestDemoState;
    const parsed = JSON.parse(stored) as GuestDemoState;
    return parsed.version === 1 ? parsed : initialGuestDemoState;
  } catch {
    return initialGuestDemoState;
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

  useEffect(() => {
    const storedState = readStoredState();
    queueMicrotask(() => {
      dispatch({ type: "hydrate", state: storedState });
      hydrated.current = true;
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated.current) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

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
    if (!ready) return;
    dispatch({ type: "create-leave", input });
    notify("Solicitud registrada en esta sesión");
  }

  function transitionLeave(
    requestId: string,
    status: LeaveRequestStatus,
    note: string,
  ) {
    if (!ready) return;
    dispatch({ type: "transition-leave", requestId, status, note });
    notify(
      status === "approved" ? "Solicitud aprobada" : "Solicitud rechazada",
    );
  }

  function content() {
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

    return (
      <ModuleWorkspace
        moduleId={
          state.activeModule as Exclude<ModuleId, "inicio" | "vacaciones">
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
          window.sessionStorage.removeItem(STORAGE_KEY);
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
