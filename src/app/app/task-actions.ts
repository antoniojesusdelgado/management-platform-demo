"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/domain/action-result";
import {
  taskInputSchema,
  taskStatuses,
  type TaskInput,
} from "@/domain/tasks";
import { requirePermission } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";

const taskIdSchema = z.uuid();
const transitionSchema = z.object({
  taskId: taskIdSchema,
  status: z.enum(taskStatuses),
  note: z.string().trim().min(3).max(300),
});
const commentSchema = z.object({
  taskId: taskIdSchema,
  body: z.string().trim().min(2).max(1_000),
});
const dependencySchema = z.object({
  taskId: taskIdSchema,
  dependsOnTaskId: taskIdSchema,
}).refine((value) => value.taskId !== value.dependsOnTaskId);

function mapTaskActionError(error: unknown): ActionResult<never> {
  if (error instanceof z.ZodError) {
    return actionFailure("validation_error", "Revisa los datos introducidos.");
  }
  if (error instanceof Error && error.message === "Authentication required") {
    return actionFailure(
      "authentication_required",
      "La sesión ha caducado. Inicia sesión de nuevo.",
    );
  }
  if (error instanceof Error && error.message === "Permission denied") {
    return actionFailure(
      "permission_denied",
      "No tienes permiso para gestionar tareas.",
    );
  }
  return actionFailure("unexpected_error", "No se pudo completar la operación.");
}

async function resolveAssigneeId(
  organizationId: string,
  assigneeName: string | null,
) {
  if (!assigneeName) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people")
    .select("id,display_name")
    .eq("organization_id", organizationId)
    .eq("status", "active");
  if (error) throw new Error("Assignee lookup failed");
  const person = data.find((item) => item.display_name === assigneeName);
  if (!person) throw new z.ZodError([]);
  return person.id;
}

export async function createTaskAction(input: TaskInput): Promise<ActionResult> {
  try {
    const payload = taskInputSchema.parse(input);
    const access = await requirePermission("tasks.items.manage");
    const assigneeId = await resolveAssigneeId(
      access.organizationId,
      payload.assigneeName,
    );
    const supabase = await createClient();
    const { error } = await supabase.from("tasks").insert({
      organization_id: access.organizationId,
      title: payload.title,
      description: payload.description,
      status: "pending",
      priority: payload.priority,
      project_id: payload.projectId ?? null,
      assignee_person_id: assigneeId,
      due_date: payload.dueDate,
      created_by: access.userId,
    });
    if (error) return actionFailure("conflict", "No se pudo crear la tarea.");
    revalidatePath("/app/tareas");
    return actionSuccess();
  } catch (error) {
    return mapTaskActionError(error);
  }
}

export async function updateTaskAction(
  taskId: string,
  input: TaskInput,
): Promise<ActionResult> {
  try {
    const id = taskIdSchema.parse(taskId);
    const payload = taskInputSchema.parse(input);
    const access = await requirePermission("tasks.items.manage");
    const assigneeId = await resolveAssigneeId(
      access.organizationId,
      payload.assigneeName,
    );
    const supabase = await createClient();
    const { error } = await supabase
      .from("tasks")
      .update({
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        project_id: payload.projectId ?? null,
        assignee_person_id: assigneeId,
        due_date: payload.dueDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", access.organizationId);
    if (error) return actionFailure("conflict", "No se pudo actualizar la tarea.");
    revalidatePath("/app/tareas");
    return actionSuccess();
  } catch (error) {
    return mapTaskActionError(error);
  }
}

export async function transitionTaskAction(input: {
  taskId: string;
  status: (typeof taskStatuses)[number];
  note: string;
}): Promise<ActionResult> {
  try {
    const payload = transitionSchema.parse(input);
    const access = await requirePermission("tasks.items.manage");
    const supabase = await createClient();
    const { error } = await supabase.rpc("transition_task", {
      target_task_id: payload.taskId,
      target_status: payload.status,
      transition_note: payload.note,
      expected_organization_id: access.organizationId,
    });
    if (error) {
      return actionFailure(
        "conflict",
        "La tarea cambió o la transición ya no está disponible.",
      );
    }
    revalidatePath("/app/tareas");
    return actionSuccess();
  } catch (error) {
    return mapTaskActionError(error);
  }
}

export async function addTaskCommentAction(input: {
  taskId: string;
  body: string;
}): Promise<ActionResult> {
  try {
    const payload = commentSchema.parse(input);
    const access = await requirePermission("tasks.items.manage");
    const supabase = await createClient();
    const { error } = await supabase.from("task_comments").insert({
      organization_id: access.organizationId,
      task_id: payload.taskId,
      author_profile_id: access.userId,
      body: payload.body,
    });
    if (error) return actionFailure("conflict", "No se pudo añadir el comentario.");
    revalidatePath("/app/tareas");
    return actionSuccess();
  } catch (error) {
    return mapTaskActionError(error);
  }
}

export async function addTaskDependencyAction(input: {
  taskId: string;
  dependsOnTaskId: string;
}): Promise<ActionResult> {
  try {
    const payload = dependencySchema.parse(input);
    const access = await requirePermission("tasks.items.manage");
    const supabase = await createClient();
    const { error } = await supabase.from("task_dependencies").insert({
      organization_id: access.organizationId,
      task_id: payload.taskId,
      depends_on_task_id: payload.dependsOnTaskId,
      created_by: access.userId,
    });
    if (error) {
      return actionFailure(
        "conflict",
        "La dependencia ya existe, pertenece a otro espacio o crearía un ciclo.",
      );
    }
    revalidatePath("/app/tareas");
    return actionSuccess();
  } catch (error) {
    return mapTaskActionError(error);
  }
}
