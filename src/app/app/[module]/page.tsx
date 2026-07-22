import { IconLock, IconSettings } from "@tabler/icons-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthenticatedApp } from "@/components/authenticated-app";
import { isModuleId } from "@/domain/modules";
import type { LeaveRequest, LeaveRequestEvent } from "@/domain/vacations";
import type {
  TaskComment,
  TaskDependency,
  TaskEvent,
  TaskItem,
} from "@/domain/tasks";
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
  let leaveLoadError: string | undefined;
  let tasks: TaskItem[] = [];
  let taskDependencies: TaskDependency[] = [];
  let taskComments: TaskComment[] = [];
  let taskEvents: TaskEvent[] = [];
  let taskAssignees: string[] = [];
  let currentUserName: string | undefined;
  let taskLoadError: string | undefined;

  if (module === "vacaciones") {
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
    />
  );
}
