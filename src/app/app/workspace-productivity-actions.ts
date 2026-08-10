"use server";

import { actionFailure, actionSuccess, type ActionResult } from "@/domain/action-result";
import {
  workspaceSearchQuerySchema,
  workspaceSearchResultSchema,
  type WorkspaceSearchResult,
  type WorkspacePriority,
  type WorkspaceWorkItem,
} from "@/domain/workspace-productivity";
import { getWorkspaceAccess } from "@/lib/auth";
import { hasWorkspacePermission } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";

const href = (moduleId: string, id: string) =>
  `/app/${moduleId}?focus=${encodeURIComponent(id)}`;

export async function searchWorkspaceAction(
  rawQuery: string,
): Promise<ActionResult<WorkspaceSearchResult[]>> {
  const parsed = workspaceSearchQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return actionFailure("validation_error", "Escribe al menos dos caracteres de texto válido.");
  }
  const access = await getWorkspaceAccess();
  if (access.status !== "active") {
    return actionFailure("authentication_required", "Inicia sesión para buscar en tu espacio.");
  }

  const [canSeePeople, canSeeProjects, canSeeTasks, canSeeIncidents] = await Promise.all([
    hasWorkspacePermission("people.profiles.view"),
    hasWorkspacePermission("projects.items.view"),
    hasWorkspacePermission("tasks.items.view"),
    hasWorkspacePermission("incidents.tickets.view"),
  ]);
  const supabase = await createClient();
  const pattern = `%${parsed.data}%`;
  const [peopleResult, projectsResult, tasksResult, incidentsResult] = await Promise.all([
    canSeePeople
      ? supabase.from("people").select("id,display_name,position_title,team,status").eq("organization_id", access.organizationId).ilike("display_name", pattern).order("display_name").limit(5)
      : Promise.resolve({ data: [], error: null }),
    canSeeProjects
      ? supabase.from("projects").select("id,code,name,status,owner:people!projects_owner_person_id_fkey(display_name)").eq("organization_id", access.organizationId).ilike("name", pattern).order("updated_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [], error: null }),
    canSeeTasks
      ? supabase.from("tasks").select("id,title,status,priority,project:projects(name),assignee:people!tasks_assignee_person_id_fkey(display_name)").eq("organization_id", access.organizationId).ilike("title", pattern).order("updated_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [], error: null }),
    canSeeIncidents
      ? supabase.from("incidents").select("id,title,status,priority,affected_service,assignee:people!incidents_assignee_person_id_fkey(display_name)").eq("organization_id", access.organizationId).ilike("title", pattern).order("updated_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (peopleResult.error || projectsResult.error || tasksResult.error || incidentsResult.error) {
    return actionFailure("unexpected_error", "No se pudo completar la búsqueda. Inténtalo de nuevo.");
  }

  const results: WorkspaceSearchResult[] = [
    ...(peopleResult.data ?? []).map((person) => ({
      id: person.id, kind: "person" as const, title: person.display_name,
      description: `${person.position_title} · ${person.team}`, moduleId: "personal" as const,
      href: href("personal", person.id), status: person.status,
    })),
    ...(projectsResult.data ?? []).map((project) => ({
      id: project.id, kind: "project" as const, title: project.name,
      description: `${project.code} · ${(project.owner as unknown as { display_name: string } | null)?.display_name ?? "Sin responsable"}`,
      moduleId: "proyectos" as const, href: href("proyectos", project.id), status: project.status,
    })),
    ...(tasksResult.data ?? []).map((task) => ({
      id: task.id, kind: "task" as const, title: task.title,
      description: `${(task.project as unknown as { name: string } | null)?.name ?? "Sin proyecto"} · ${(task.assignee as unknown as { display_name: string } | null)?.display_name ?? "Sin asignar"}`,
      moduleId: "tareas" as const, href: href("tareas", task.id), status: task.status,
      priority: task.priority === "urgent" ? "critical" as const : task.priority,
    })),
    ...(incidentsResult.data ?? []).map((incident) => ({
      id: incident.id, kind: "incident" as const, title: incident.title,
      description: `${incident.affected_service ?? "Servicio general"} · ${(incident.assignee as unknown as { display_name: string } | null)?.display_name ?? "Sin asignar"}`,
      moduleId: "incidencias" as const, href: href("incidencias", incident.id), status: incident.status,
      priority: incident.priority,
    })),
  ];
  const constrained = workspaceSearchResultSchema.array().safeParse(results);
  return constrained.success
    ? actionSuccess(constrained.data)
    : actionFailure("unexpected_error", "La respuesta de búsqueda no era válida.");
}

export async function loadWorkspaceInboxAction(): Promise<ActionResult<WorkspaceWorkItem[]>> {
  const access = await getWorkspaceAccess();
  if (access.status !== "active") {
    return actionFailure("authentication_required", "Inicia sesión para consultar tu bandeja.");
  }
  const [canSeeTasks, canSeeIncidents, canApproveLeave, canManageQuality, canSeeNotifications] = await Promise.all([
    hasWorkspacePermission("tasks.items.view"),
    hasWorkspacePermission("incidents.tickets.view"),
    hasWorkspacePermission("vacations.requests.approve"),
    hasWorkspacePermission("integrations.runs.manage"),
    hasWorkspacePermission("operations.notifications.view"),
  ]);
  const supabase = await createClient();
  const { data: person } = await supabase.from("people").select("id").eq("organization_id", access.organizationId).eq("profile_id", access.userId).maybeSingle();
  const [tasksResult, incidentsResult, leaveResult, qualityResult, notificationsResult] = await Promise.all([
    canSeeTasks && person
      ? supabase.from("tasks").select("id,title,priority,due_date,project:projects(name)").eq("organization_id", access.organizationId).eq("assignee_person_id", person.id).neq("status", "completed").order("due_date", { ascending: true, nullsFirst: false }).limit(15)
      : Promise.resolve({ data: [], error: null }),
    canSeeIncidents && person
      ? supabase.from("incidents").select("id,title,priority,sla_due_at,affected_service").eq("organization_id", access.organizationId).eq("assignee_person_id", person.id).not("status", "in", '("resolved","closed")').order("sla_due_at").limit(15)
      : Promise.resolve({ data: [], error: null }),
    canApproveLeave
      ? supabase.from("leave_requests").select("id,start_date,business_days,person:people!leave_requests_person_id_fkey(display_name)").eq("organization_id", access.organizationId).eq("status", "submitted").order("start_date").limit(15)
      : Promise.resolve({ data: [], error: null }),
    canManageQuality
      ? supabase.from("data_quality_issues").select("id,severity,code,safe_message,created_at").eq("organization_id", access.organizationId).is("resolved_at", null).order("created_at", { ascending: false }).limit(15)
      : Promise.resolve({ data: [], error: null }),
    canSeeNotifications
      ? supabase.from("operational_notifications").select("id,title,description,priority,href,created_at").eq("organization_id", access.organizationId).eq("recipient_profile_id", access.userId).eq("status", "unread").order("created_at", { ascending: false }).limit(15)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (tasksResult.error || incidentsResult.error || leaveResult.error || qualityResult.error || notificationsResult.error) {
    return actionFailure("unexpected_error", "No se pudo cargar la bandeja de trabajo.");
  }
  const items: WorkspaceWorkItem[] = [
    ...(tasksResult.data ?? []).map((task) => ({
      id: task.id, kind: "task" as const, title: task.title,
      description: (task.project as unknown as { name: string } | null)?.name ?? "Tarea sin proyecto",
      moduleId: "tareas" as const, href: href("tareas", task.id),
      priority: task.priority === "urgent" ? "critical" as const : task.priority,
      dueAt: task.due_date,
    })),
    ...(incidentsResult.data ?? []).map((incident) => ({
      id: incident.id, kind: "incident" as const, title: incident.title,
      description: incident.affected_service ?? "Incidencia asignada", moduleId: "incidencias" as const,
      href: href("incidencias", incident.id), priority: incident.priority, dueAt: incident.sla_due_at,
    })),
    ...(leaveResult.data ?? []).map((request) => ({
      id: request.id, kind: "leave" as const,
      title: `Solicitud de ${(request.person as unknown as { display_name: string }).display_name}`,
      description: `${request.business_days} días · ${request.start_date}`, moduleId: "vacaciones" as const,
      href: href("vacaciones", request.id), priority: "medium" as const, dueAt: request.start_date,
    })),
    ...(qualityResult.data ?? []).map((issue) => ({
      id: issue.id, kind: "quality" as const, title: issue.safe_message,
      description: `Control de calidad · ${issue.code}`, moduleId: "nominas" as const,
      href: href("nominas", issue.id),
      priority: issue.severity === "error" ? "critical" as const : issue.severity === "warning" ? "high" as const : "low" as const,
      dueAt: null,
    })),
    ...(notificationsResult.data ?? []).map((notification) => ({
      id: notification.id,
      kind: "notification" as const,
      title: notification.title,
      description: notification.description,
      moduleId: "operaciones" as const,
      href: notification.href,
      priority: (notification.priority === "critical" || notification.priority === "high" || notification.priority === "low" ? notification.priority : "medium") as WorkspacePriority,
      dueAt: notification.created_at,
    })),
  ];
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  return actionSuccess(items.sort((a, b) => order[a.priority] - order[b.priority] || (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999")).slice(0, 30));
}
