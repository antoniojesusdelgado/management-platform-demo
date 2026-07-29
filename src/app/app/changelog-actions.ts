"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionFailure, actionSuccess, type ActionResult } from "@/domain/action-result";
import { changelogInputSchema, changelogStatuses, type ChangelogInput } from "@/domain/changelog";
import { plainTextSchema } from "@/domain/validation";
import { requirePermission } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.uuid();
const transitionSchema = z.object({ entryId: idSchema, status: z.enum(changelogStatuses), note: plainTextSchema({ min: 3, max: 1_000 }) });
function failure(error: unknown): ActionResult<never> {
  if (error instanceof z.ZodError) return actionFailure("validation_error", "Revisa los datos introducidos.");
  if (error instanceof Error && error.message === "Authentication required") return actionFailure("authentication_required", "La sesión ha caducado. Inicia sesión de nuevo.");
  if (error instanceof Error && error.message === "Permission denied") return actionFailure("permission_denied", "No tienes permiso para gestionar novedades.");
  return actionFailure("unexpected_error", "No se pudo completar la operación.");
}

export async function createChangelogAction(input: ChangelogInput): Promise<ActionResult> {
  try {
    const payload = changelogInputSchema.parse(input);
    const access = await requirePermission("changelog.entries.manage");
    const supabase = await createClient();
    const { error } = await supabase.from("changelog_entries").insert({ organization_id: access.organizationId, version: payload.version, title: payload.title, summary: payload.summary, status: "draft", created_by: access.userId });
    if (error) return actionFailure("conflict", "La versión ya existe o no se pudo crear.");
    revalidatePath("/app/novedades");
    return actionSuccess();
  } catch (error) { return failure(error); }
}

export async function updateChangelogAction(id: string, input: ChangelogInput): Promise<ActionResult> {
  try {
    const entryId = idSchema.parse(id);
    const payload = changelogInputSchema.parse(input);
    const access = await requirePermission("changelog.entries.manage");
    const supabase = await createClient();
    const { error } = await supabase.from("changelog_entries").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", entryId).eq("organization_id", access.organizationId).neq("status", "published");
    if (error) return actionFailure("conflict", "No se pudo actualizar la novedad.");
    revalidatePath("/app/novedades");
    return actionSuccess();
  } catch (error) { return failure(error); }
}

export async function transitionChangelogAction(input: z.infer<typeof transitionSchema>): Promise<ActionResult> {
  try {
    const payload = transitionSchema.parse(input);
    const access = await requirePermission("changelog.entries.manage");
    const supabase = await createClient();
    const { error } = await supabase.rpc("transition_changelog_entry", { target_entry_id: payload.entryId, target_status: payload.status, transition_note: payload.note, expected_organization_id: access.organizationId });
    if (error) return actionFailure("conflict", "La transición ya no está disponible.");
    revalidatePath("/app/novedades");
    return actionSuccess();
  } catch (error) { return failure(error); }
}
