import { IconLock, IconSettings } from "@tabler/icons-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthenticatedApp } from "@/components/authenticated-app";
import { isModuleId } from "@/domain/modules";
import type { LeaveRequest, LeaveRequestEvent } from "@/domain/vacations";
import { getWorkspaceAccess } from "@/lib/auth";
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
              Acceso no concedido
            </p>
            <h1>Esta cuenta no tiene una invitación activa</h1>
            <p>
              El inicio de sesión ha sido válido, pero la organización no ha
              autorizado esta cuenta.
            </p>
          </div>
          <aside className="demo-note">
            <IconLock aria-hidden="true" size={31} />
            <h2 style={{ marginTop: "1rem" }}>Registro público desactivado</h2>
          </aside>
        </section>
      </main>
    );
  }

  let leaveRequests: LeaveRequest[] = [];
  let leaveEvents: LeaveRequestEvent[] = [];

  if (module === "vacaciones") {
    const supabase = await createClient();
    const [{ data: requests }, { data: events }] = await Promise.all([
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

  return (
    <AuthenticatedApp
      activeModule={module}
      organizationName={access.organizationName}
      leaveRequests={leaveRequests}
      leaveEvents={leaveEvents}
    />
  );
}
