"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast, Toaster } from "sonner";
import {
  createLeaveRequestAction,
  transitionLeaveRequestAction,
} from "@/app/app/vacation-actions";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { ModuleWorkspace } from "@/components/module-workspace";
import { VacationsWorkspace } from "@/components/vacations-workspace";
import type { ModuleId } from "@/domain/modules";
import type {
  LeaveRequest,
  LeaveRequestEvent,
  LeaveRequestInput,
  LeaveRequestStatus,
} from "@/domain/vacations";

type AuthenticatedAppProps = {
  activeModule: ModuleId;
  organizationName: string;
  leaveRequests?: LeaveRequest[];
  leaveEvents?: LeaveRequestEvent[];
};

export function AuthenticatedApp({
  activeModule,
  organizationName,
  leaveRequests = [],
  leaveEvents = [],
}: AuthenticatedAppProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localName, setLocalName] = useState(organizationName);

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
        onCreate={(input: LeaveRequestInput) => {
          startTransition(async () => {
            try {
              await createLeaveRequestAction(input);
              toast.success("Solicitud enviada");
            } catch {
              toast.error("No se pudo registrar la solicitud");
            }
          });
        }}
        onTransition={(
          requestId: string,
          status: LeaveRequestStatus,
          note: string,
        ) => {
          if (!["approved", "rejected", "cancelled"].includes(status)) return;
          startTransition(async () => {
            try {
              await transitionLeaveRequestAction({
                requestId,
                status: status as "approved" | "rejected" | "cancelled",
                note,
              });
              toast.success("Solicitud actualizada");
            } catch {
              toast.error("No se pudo actualizar la solicitud");
            }
          });
        }}
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
