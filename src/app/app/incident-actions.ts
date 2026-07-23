"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionFailure, actionSuccess, type ActionResult } from "@/domain/action-result";
import { calculateSyntheticSlaDueAt, incidentInputSchema, incidentStatuses, type IncidentInput } from "@/domain/incidents";
import { requirePermission } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.uuid();
const transitionSchema = z.object({ incidentId: idSchema, status: z.enum(incidentStatuses), note: z.string().trim().min(3).max(2_000) });

function failure(error: unknown): ActionResult<never> {
  if (error instanceof z.ZodError) return actionFailure("validation_error", "Revisa los datos introducidos.");
  if (error instanceof Error && error.message === "Authentication required") return actionFailure("authentication_required", "La sesión ha caducado. Inicia sesión de nuevo.");
  if (error instanceof Error && error.message === "Permission denied") return actionFailure("permission_denied", "No tienes permiso para gestionar incidencias.");
  return actionFailure("unexpected_error", "No se pudo completar la operación.");
}

async function resolveAssigneeId(organizationId: string, name: string | null) {
  if (!name) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("memberships").select("profile_id,profiles!inner(display_name)").eq("organization_id", organizationId).eq("status", "active");
  if (error) throw new Error("Assignee lookup failed");
  const member = data.find((item) => (item.profiles as unknown as { display_name: string }).display_name === name);
  if (!member) throw new z.ZodError([]);
  return member.profile_id;
}

export async function createIncidentAction(input: IncidentInput): Promise<ActionResult> {
  try {
    const payload = incidentInputSchema.parse(input);
    const access = await requirePermission("incidents.tickets.manage");
    const assigneeId = await resolveAssigneeId(access.organizationId, payload.assigneeName);
    const supabase = await createClient();
    const { error } = await supabase.from("incidents").insert({
      organization_id: access.organizationId, reference: `INC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      title: payload.title, description: payload.description, status: "registered",
      priority: payload.priority, category: payload.category, requester_profile_id: access.userId,
      assignee_profile_id: assigneeId, sla_due_at: calculateSyntheticSlaDueAt(payload.priority),
    });
    if (error) return actionFailure("conflict", "No se pudo registrar la incidencia.");
    revalidatePath("/app/incidencias");
    return actionSuccess();
  } catch (error) { return failure(error); }
}

export async function updateIncidentAction(id: string, input: IncidentInput): Promise<ActionResult> {
  try {
    const incidentId = idSchema.parse(id);
    const payload = incidentInputSchema.parse(input);
    const access = await requirePermission("incidents.tickets.manage");
    const assigneeId = await resolveAssigneeId(access.organizationId, payload.assigneeName);
    const supabase = await createClient();
    const { error } = await supabase.from("incidents").update({ title: payload.title, description: payload.description, priority: payload.priority, category: payload.category, assignee_profile_id: assigneeId, updated_at: new Date().toISOString() }).eq("id", incidentId).eq("organization_id", access.organizationId);
    if (error) return actionFailure("conflict", "No se pudo actualizar la incidencia.");
    revalidatePath("/app/incidencias");
    return actionSuccess();
  } catch (error) { return failure(error); }
}

export async function transitionIncidentAction(input: z.infer<typeof transitionSchema>): Promise<ActionResult> {
  try {
    const payload = transitionSchema.parse(input);
    const access = await requirePermission("incidents.tickets.manage");
    const supabase = await createClient();
    const { error } = await supabase.rpc("transition_incident", { target_incident_id: payload.incidentId, target_status: payload.status, transition_note: payload.note, expected_organization_id: access.organizationId });
    if (error) return actionFailure("conflict", "La transición ya no está disponible.");
    revalidatePath("/app/incidencias");
    return actionSuccess();
  } catch (error) { return failure(error); }
}
