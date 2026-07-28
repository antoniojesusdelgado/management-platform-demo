import { z } from "zod";

export const projectStatuses = [
  "planned",
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;

export const projectHealthValues = [
  "on_track",
  "at_risk",
  "off_track",
] as const;

export type ProjectStatus = (typeof projectStatuses)[number];
export type ProjectHealth = (typeof projectHealthValues)[number];

export type Project = {
  id: string;
  code: string;
  name: string;
  summary: string;
  status: ProjectStatus;
  health: ProjectHealth;
  ownerPersonId: string | null;
  ownerName: string | null;
  startDate: string | null;
  targetDate: string | null;
  color: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type ProjectEvent = {
  id: string;
  projectId: string;
  kind: "created" | "updated" | "status" | "health" | "member";
  note: string;
  actorName: string;
  createdAt: string;
};

export const projectInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(16)
      .regex(/^[A-Z][A-Z0-9-]+$/),
    name: z.string().trim().min(3).max(120),
    summary: z.string().trim().max(1_000),
    status: z.enum(projectStatuses),
    health: z.enum(projectHealthValues),
    ownerPersonId: z.uuid().nullable(),
    startDate: z.iso.date().nullable(),
    targetDate: z.iso.date().nullable(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    memberIds: z.array(z.uuid()).max(100),
  })
  .refine(
    (value) =>
      !value.startDate ||
      !value.targetDate ||
      value.targetDate >= value.startDate,
    {
      message: "La fecha objetivo debe ser posterior al inicio.",
      path: ["targetDate"],
    },
  );

export type ProjectInput = z.infer<typeof projectInputSchema>;

export function getProjectProgress(
  projectId: string,
  tasks: readonly { projectId?: string | null; status: string }[],
) {
  const projectTasks = tasks.filter((task) => task.projectId === projectId);
  if (projectTasks.length === 0) return 0;
  const completed = projectTasks.filter(
    (task) => task.status === "completed",
  ).length;
  if (completed === projectTasks.length) return 100;
  return Math.min(99, Math.round((completed / projectTasks.length) * 100));
}

export function synchronizeProjectWithTasks(
  project: Project,
  tasks: readonly { projectId?: string | null; status: string }[],
  updatedAt = project.updatedAt,
) {
  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  if (projectTasks.length === 0) return project;

  const isComplete = projectTasks.every((task) => task.status === "completed");
  const nextStatus: ProjectStatus = isComplete
    ? "completed"
    : project.status === "completed"
      ? "active"
      : project.status;

  return nextStatus === project.status
    ? project
    : { ...project, status: nextStatus, updatedAt };
}

export function synchronizeProjectsWithTasks(
  projects: readonly Project[],
  tasks: readonly { projectId?: string | null; status: string }[],
  updatedAt?: string,
) {
  return projects.map((project) =>
    synchronizeProjectWithTasks(project, tasks, updatedAt ?? project.updatedAt),
  );
}
