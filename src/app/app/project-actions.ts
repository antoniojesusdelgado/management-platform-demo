"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/domain/action-result";
import {
  projectInputSchema,
  type ProjectInput,
} from "@/domain/projects";
import { requirePermission } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";

const projectIdSchema = z.uuid();

function mapProjectError(error: unknown): ActionResult<never> {
  if (error instanceof z.ZodError) {
    return actionFailure("validation_error", "Revisa los datos del proyecto.");
  }
  if (
    error instanceof Error &&
    error.message === "Authentication required"
  ) {
    return actionFailure(
      "authentication_required",
      "La sesión ha caducado. Inicia sesión de nuevo.",
    );
  }
  if (error instanceof Error && error.message === "Permission denied") {
    return actionFailure(
      "permission_denied",
      "No tienes permiso para gestionar proyectos.",
    );
  }
  return actionFailure(
    "unexpected_error",
    "No se pudo completar la operación.",
  );
}

async function validatePeople(
  organizationId: string,
  input: ProjectInput,
) {
  const ids = [
    ...new Set([
      ...input.memberIds,
      ...(input.ownerPersonId ? [input.ownerPersonId] : []),
    ]),
  ];
  if (ids.length === 0) return;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people")
    .select("id")
    .eq("organization_id", organizationId)
    .in("id", ids);
  if (error || data.length !== ids.length) throw new z.ZodError([]);
}

export async function createProjectAction(
  input: ProjectInput,
): Promise<ActionResult> {
  try {
    const payload = projectInputSchema.parse(input);
    const access = await requirePermission("projects.items.manage");
    await validatePeople(access.organizationId, payload);
    const supabase = await createClient();
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        organization_id: access.organizationId,
        code: payload.code,
        name: payload.name,
        summary: payload.summary,
        status: payload.status,
        health: payload.health,
        owner_person_id: payload.ownerPersonId,
        start_date: payload.startDate,
        target_date: payload.targetDate,
        color: payload.color,
        created_by: access.userId,
      })
      .select("id")
      .single();
    if (projectError || !project) {
      return actionFailure(
        "conflict",
        "El código ya existe o el proyecto no es válido.",
      );
    }

    if (payload.memberIds.length) {
      const { error: memberError } = await supabase
        .from("project_members")
        .insert(
          payload.memberIds.map((personId) => ({
            project_id: project.id,
            person_id: personId,
            organization_id: access.organizationId,
            created_by: access.userId,
          })),
        );
      if (memberError) {
        await supabase
          .from("projects")
          .delete()
          .eq("id", project.id)
          .eq("organization_id", access.organizationId);
        return actionFailure(
          "conflict",
          "No se pudieron validar los miembros del proyecto.",
        );
      }
    }

    revalidatePath("/app/proyectos");
    return actionSuccess();
  } catch (error) {
    return mapProjectError(error);
  }
}

export async function updateProjectAction(
  projectId: string,
  input: ProjectInput,
): Promise<ActionResult> {
  try {
    const id = projectIdSchema.parse(projectId);
    const payload = projectInputSchema.parse(input);
    const access = await requirePermission("projects.items.manage");
    await validatePeople(access.organizationId, payload);
    const supabase = await createClient();
    const { error } = await supabase
      .from("projects")
      .update({
        name: payload.name,
        summary: payload.summary,
        status: payload.status,
        health: payload.health,
        owner_person_id: payload.ownerPersonId,
        start_date: payload.startDate,
        target_date: payload.targetDate,
        color: payload.color,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", access.organizationId);
    if (error) {
      return actionFailure("conflict", "No se pudo actualizar el proyecto.");
    }

    const { error: deleteError } = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", id)
      .eq("organization_id", access.organizationId);
    if (deleteError) {
      return actionFailure(
        "conflict",
        "No se pudieron actualizar los miembros.",
      );
    }
    if (payload.memberIds.length) {
      const { error: memberError } = await supabase
        .from("project_members")
        .insert(
          payload.memberIds.map((personId) => ({
            project_id: id,
            person_id: personId,
            organization_id: access.organizationId,
            created_by: access.userId,
          })),
        );
      if (memberError) {
        return actionFailure(
          "conflict",
          "No se pudieron actualizar los miembros.",
        );
      }
    }

    revalidatePath("/app/proyectos");
    revalidatePath("/app/tareas");
    revalidatePath("/app/incidencias");
    return actionSuccess();
  } catch (error) {
    return mapProjectError(error);
  }
}
