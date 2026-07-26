import { z } from "zod";

export const taskStatuses = [
  "pending",
  "in_progress",
  "blocked",
  "in_review",
  "completed",
] as const;

export const taskPriorities = ["low", "medium", "high", "urgent"] as const;

export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId?: string | null;
  projectName?: string | null;
  assigneePersonId?: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskDependency = {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  createdAt: string;
};

export type TaskComment = {
  id: string;
  taskId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type TaskEvent = {
  id: string;
  taskId: string;
  kind: "created" | "updated" | "assigned" | "status" | "comment" | "dependency";
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  note: string;
  actorName: string;
  createdAt: string;
};

export const taskInputSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2_000),
  priority: z.enum(taskPriorities),
  projectId: z.uuid().nullable().optional(),
  assigneeName: z.string().trim().min(2).max(100).nullable(),
  dueDate: z.iso.date().nullable(),
});

export type TaskInput = z.input<typeof taskInputSchema>;

const allowedTransitions: Record<TaskStatus, readonly TaskStatus[]> = {
  pending: ["in_progress", "blocked"],
  in_progress: ["blocked", "in_review"],
  blocked: ["in_progress"],
  in_review: ["in_progress", "completed"],
  completed: [],
};

export function canTransitionTask(from: TaskStatus, to: TaskStatus) {
  return allowedTransitions[from].includes(to);
}

export function transitionTask(
  task: TaskItem,
  status: TaskStatus,
  updatedAt = new Date().toISOString(),
): TaskItem {
  if (!canTransitionTask(task.status, status)) {
    throw new Error("Invalid task transition");
  }

  return { ...task, status, updatedAt };
}

export function createsTaskDependencyCycle(
  dependencies: readonly TaskDependency[],
  taskId: string,
  dependsOnTaskId: string,
) {
  if (taskId === dependsOnTaskId) return true;

  const graph = new Map<string, string[]>();
  for (const dependency of dependencies) {
    const current = graph.get(dependency.taskId) ?? [];
    current.push(dependency.dependsOnTaskId);
    graph.set(dependency.taskId, current);
  }
  graph.set(taskId, [...(graph.get(taskId) ?? []), dependsOnTaskId]);

  const visited = new Set<string>();
  const active = new Set<string>();

  function visit(id: string): boolean {
    if (active.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    active.add(id);
    for (const dependencyId of graph.get(id) ?? []) {
      if (visit(dependencyId)) return true;
    }
    active.delete(id);
    return false;
  }

  return [...graph.keys()].some(visit);
}

export function isTaskOverdue(task: TaskItem, today: string) {
  return Boolean(
    task.dueDate && task.dueDate < today && task.status !== "completed",
  );
}
