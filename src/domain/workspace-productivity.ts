import { z } from "zod";
import type { GuestDemoState } from "@/domain/guest-demo";
import type { ModuleId } from "@/domain/modules";
import { plainTextSchema } from "@/domain/validation";

export const workspaceSearchQuerySchema = plainTextSchema({ min: 2, max: 80 });

export const workspaceSearchKinds = [
  "person",
  "project",
  "task",
  "incident",
] as const;

export type WorkspaceSearchKind = (typeof workspaceSearchKinds)[number];
export type WorkspacePriority = "low" | "medium" | "high" | "critical";

export type WorkspaceSearchResult = {
  id: string;
  kind: WorkspaceSearchKind;
  title: string;
  description: string;
  moduleId: ModuleId;
  href: string;
  status?: string;
  priority?: WorkspacePriority;
};

export type WorkspaceWorkItem = {
  id: string;
  kind: "task" | "leave" | "incident" | "quality";
  title: string;
  description: string;
  moduleId: ModuleId;
  href: string;
  priority: WorkspacePriority;
  dueAt?: string | null;
};

export const workspaceSearchResultSchema = z.object({
  id: z.string().min(1).max(160),
  kind: z.enum(workspaceSearchKinds),
  title: plainTextSchema({ min: 1, max: 160 }),
  description: plainTextSchema({ max: 240 }),
  moduleId: z.enum([
    "inicio", "analitica", "vacaciones", "proyectos", "tareas", "incidencias",
    "tesoreria", "nominas", "personal", "novedades", "configuracion",
  ]),
  href: z.string().startsWith("/app/").max(240),
  status: plainTextSchema({ max: 80 }).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
});

const normalized = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");

const matches = (query: string, ...values: Array<string | null | undefined>) => {
  const needle = normalized(query);
  return values.some((value) => value && normalized(value).includes(needle));
};

const href = (moduleId: ModuleId, id: string) =>
  `/app/${moduleId}?focus=${encodeURIComponent(id)}`;

const taskPriority = (priority: string): WorkspacePriority =>
  priority === "urgent" ? "critical" : priority as WorkspacePriority;

export function searchGuestWorkspace(
  state: GuestDemoState,
  rawQuery: string,
): WorkspaceSearchResult[] {
  const parsed = workspaceSearchQuerySchema.safeParse(rawQuery);
  if (!parsed.success) return [];
  const query = parsed.data;

  const people = state.people
    .filter((person) => matches(query, person.displayName, person.team, person.positionTitle))
    .slice(0, 5)
    .map((person) => ({
      id: person.id,
      kind: "person" as const,
      title: person.displayName,
      description: `${person.positionTitle} · ${person.team}`,
      moduleId: "personal" as const,
      href: href("personal", person.id),
      status: person.status,
    }));
  const projects = state.projects
    .filter((project) => matches(query, project.code, project.name, project.summary, project.ownerName))
    .slice(0, 5)
    .map((project) => ({
      id: project.id,
      kind: "project" as const,
      title: project.name,
      description: `${project.code} · ${project.ownerName ?? "Sin responsable"}`,
      moduleId: "proyectos" as const,
      href: href("proyectos", project.id),
      status: project.status,
    }));
  const tasks = state.tasks
    .filter((task) => matches(query, task.title, task.description, task.projectName, task.assigneeName))
    .slice(0, 5)
    .map((task) => ({
      id: task.id,
      kind: "task" as const,
      title: task.title,
      description: `${task.projectName ?? "Sin proyecto"} · ${task.assigneeName ?? "Sin asignar"}`,
      moduleId: "tareas" as const,
      href: href("tareas", task.id),
      status: task.status,
      priority: taskPriority(task.priority),
    }));
  const incidents = state.incidents
    .filter((incident) => matches(query, incident.title, incident.description, incident.affectedService, incident.assigneeName))
    .slice(0, 5)
    .map((incident) => ({
      id: incident.id,
      kind: "incident" as const,
      title: incident.title,
      description: `${incident.affectedService ?? "Servicio general"} · ${incident.assigneeName ?? "Sin asignar"}`,
      moduleId: "incidencias" as const,
      href: href("incidencias", incident.id),
      status: incident.status,
      priority: incident.priority,
    }));

  return workspaceSearchResultSchema.array().parse([
    ...people,
    ...projects,
    ...tasks,
    ...incidents,
  ]);
}

const priorityOrder: Record<WorkspacePriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function buildGuestWorkItems(
  state: GuestDemoState,
  currentUserName = "Usuario invitado",
): WorkspaceWorkItem[] {
  const tasks: WorkspaceWorkItem[] = state.tasks
    .filter((task) => task.assigneeName === currentUserName && task.status !== "completed")
    .map((task) => ({
      id: task.id,
      kind: "task",
      title: task.title,
      description: task.projectName ?? "Tarea sin proyecto",
      moduleId: "tareas",
      href: href("tareas", task.id),
      priority: taskPriority(task.priority),
      dueAt: task.dueDate,
    }));
  const incidents: WorkspaceWorkItem[] = state.incidents
    .filter((incident) => incident.assigneeName === currentUserName && !["resolved", "closed"].includes(incident.status))
    .map((incident) => ({
      id: incident.id,
      kind: "incident",
      title: incident.title,
      description: incident.affectedService ?? "Incidencia asignada",
      moduleId: "incidencias",
      href: href("incidencias", incident.id),
      priority: incident.priority,
      dueAt: incident.slaDueAt,
    }));
  const leave: WorkspaceWorkItem[] = state.leaveRequests
    .filter((request) => request.status === "submitted")
    .map((request) => ({
      id: request.id,
      kind: "leave",
      title: `Solicitud de ${request.employeeName}`,
      description: `${request.businessDays} días · ${request.startDate}`,
      moduleId: "vacaciones",
      href: href("vacaciones", request.id),
      priority: "medium",
      dueAt: request.startDate,
    }));
  const quality: WorkspaceWorkItem[] = state.dataQualityIssues
    .filter((issue) => !issue.resolvedAt)
    .map((issue) => ({
      id: issue.id,
      kind: "quality",
      title: issue.safeMessage,
      description: `Control de calidad · ${issue.code}`,
      moduleId: "nominas",
      href: href("nominas", issue.id),
      priority: issue.severity === "error" ? "critical" : issue.severity === "warning" ? "high" : "low",
      dueAt: null,
    }));

  return [...tasks, ...incidents, ...leave, ...quality]
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"))
    .slice(0, 30);
}
