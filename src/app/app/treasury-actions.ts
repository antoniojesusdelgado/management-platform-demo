"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionFailure, actionSuccess, type ActionResult } from "@/domain/action-result";
import {
  treasuryInputSchema,
  treasuryStatuses,
  type TreasuryInput,
  type TreasuryStatus,
} from "@/domain/treasury";
import { requirePermission } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.uuid();
const transitionSchema = z.object({
  entryId: idSchema,
  status: z.enum(treasuryStatuses),
  note: z.string().trim().min(3).max(1_000),
});

function failure(error: unknown): ActionResult<never> {
  if (error instanceof z.ZodError) return actionFailure("validation_error", "Revisa los datos introducidos.");
  if (error instanceof Error && error.message === "Authentication required") return actionFailure("authentication_required", "La sesión ha caducado. Inicia sesión de nuevo.");
  if (error instanceof Error && error.message === "Permission denied") return actionFailure("permission_denied", "No tienes permiso para gestionar Tesorería.");
  return actionFailure("unexpected_error", "No se pudo completar la operación de Tesorería.");
}

export async function createTreasuryAction(input: TreasuryInput): Promise<ActionResult> {
  try {
    const payload = treasuryInputSchema.parse(input);
    const access = await requirePermission("treasury.entries.manage");
    const supabase = await createClient();
    const { error } = await supabase.rpc("create_treasury_entry", {
      expected_organization_id: access.organizationId,
      target_entry_date: payload.entryDate,
      target_concept: payload.concept,
      target_amount_cents: payload.amountCents,
      target_currency: payload.currency,
    });
    if (error) return actionFailure("conflict", "No se pudo crear el movimiento sintético.");
    revalidatePath("/app/tesoreria");
    return actionSuccess();
  } catch (error) {
    return failure(error);
  }
}

export async function updateTreasuryAction(id: string, input: TreasuryInput): Promise<ActionResult> {
  try {
    const entryId = idSchema.parse(id);
    const payload = treasuryInputSchema.parse(input);
    const access = await requirePermission("treasury.entries.manage");
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_treasury_draft", {
      target_entry_id: entryId,
      expected_organization_id: access.organizationId,
      target_entry_date: payload.entryDate,
      target_concept: payload.concept,
      target_amount_cents: payload.amountCents,
      target_currency: payload.currency,
    });
    if (error) return actionFailure("conflict", "Solo pueden editarse movimientos en borrador.");
    revalidatePath("/app/tesoreria");
    return actionSuccess();
  } catch (error) {
    return failure(error);
  }
}

export async function transitionTreasuryAction(
  entryId: string,
  status: TreasuryStatus,
  note: string,
): Promise<ActionResult> {
  try {
    const payload = transitionSchema.parse({ entryId, status, note });
    const access = await requirePermission("treasury.entries.manage");
    const supabase = await createClient();
    const { error } = await supabase.rpc("transition_treasury_entry", {
      target_entry_id: payload.entryId,
      target_status: payload.status,
      transition_note: payload.note,
      expected_organization_id: access.organizationId,
    });
    if (error) return actionFailure("conflict", "La transición ya no está disponible.");
    revalidatePath("/app/tesoreria");
    return actionSuccess();
  } catch (error) {
    return failure(error);
  }
}
