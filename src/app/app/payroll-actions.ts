"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionFailure, actionSuccess, type ActionResult } from "@/domain/action-result";
import { payrollInputSchema, payrollStatuses, type PayrollInput, type PayrollStatus } from "@/domain/payroll";
import { plainTextSchema } from "@/domain/validation";
import { requirePermission } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.uuid();
const transitionSchema = z.object({ runId: idSchema, status: z.enum(payrollStatuses), note: plainTextSchema({ min: 3, max: 1_000 }) });

function failure(error: unknown): ActionResult<never> {
  if (error instanceof z.ZodError) return actionFailure("validation_error", "Revisa los datos agregados introducidos.");
  if (error instanceof Error && error.message === "Authentication required") return actionFailure("authentication_required", "La sesión ha caducado. Inicia sesión de nuevo.");
  if (error instanceof Error && error.message === "Permission denied") return actionFailure("permission_denied", "No tienes permiso para gestionar Nóminas.");
  return actionFailure("unexpected_error", "No se pudo completar la operación de Nóminas.");
}

export async function createPayrollAction(input: PayrollInput): Promise<ActionResult> {
  try {
    const payload = payrollInputSchema.parse(input);
    const access = await requirePermission("payroll.runs.manage");
    const supabase = await createClient();
    const { error } = await supabase.rpc("create_payroll_run", {
      expected_organization_id: access.organizationId,
      target_period_start: payload.periodStart,
      target_period_end: payload.periodEnd,
      target_people_count: payload.peopleCount,
      target_gross_total_cents: payload.grossTotalCents,
      target_deduction_total_cents: payload.deductionTotalCents,
      target_currency: payload.currency,
      target_notes: payload.notes,
    });
    if (error) return actionFailure("conflict", "Ya existe un ciclo para ese periodo o los datos no son válidos.");
    revalidatePath("/app/nominas");
    return actionSuccess();
  } catch (error) { return failure(error); }
}

export async function updatePayrollAction(id: string, input: PayrollInput): Promise<ActionResult> {
  try {
    const runId = idSchema.parse(id);
    const payload = payrollInputSchema.parse(input);
    const access = await requirePermission("payroll.runs.manage");
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_payroll_collecting_run", {
      target_run_id: runId,
      expected_organization_id: access.organizationId,
      target_period_start: payload.periodStart,
      target_period_end: payload.periodEnd,
      target_people_count: payload.peopleCount,
      target_gross_total_cents: payload.grossTotalCents,
      target_deduction_total_cents: payload.deductionTotalCents,
      target_currency: payload.currency,
      target_notes: payload.notes,
    });
    if (error) return actionFailure("conflict", "Solo pueden editarse ciclos en recopilación.");
    revalidatePath("/app/nominas");
    return actionSuccess();
  } catch (error) { return failure(error); }
}

export async function transitionPayrollAction(runId: string, status: PayrollStatus, note: string): Promise<ActionResult> {
  try {
    const payload = transitionSchema.parse({ runId, status, note });
    const access = await requirePermission("payroll.runs.manage");
    const supabase = await createClient();
    const { error } = await supabase.rpc("transition_payroll_run", {
      target_run_id: payload.runId,
      target_status: payload.status,
      transition_note: payload.note,
      expected_organization_id: access.organizationId,
    });
    if (error) return actionFailure("conflict", "La transición ya no está disponible.");
    revalidatePath("/app/nominas");
    return actionSuccess();
  } catch (error) { return failure(error); }
}
