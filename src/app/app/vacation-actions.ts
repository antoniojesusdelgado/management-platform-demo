"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/domain/action-result";
import type { LeaveRequestInput } from "@/domain/vacations";
import { leaveRequestInputSchema } from "@/domain/vacations";
import { requirePermission } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";

const transitionSchema = z.object({
  requestId: z.uuid(),
  status: z.enum(["submitted", "approved", "rejected", "cancelled"]),
  note: z.string().trim().min(3).max(300),
});

function mapActionError(error: unknown): ActionResult<never> {
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
      "No tienes permiso para realizar esta acción.",
    );
  }
  return actionFailure(
    "unexpected_error",
    "No se pudo completar la operación.",
  );
}

export async function createLeaveRequestAction(
  input: LeaveRequestInput,
): Promise<ActionResult> {
  try {
    const payload = leaveRequestInputSchema.parse(input);
    const access = await requirePermission("vacations.requests.create");
    const supabase = await createClient();
    const { data: person, error: personError } = await supabase
      .from("people")
      .select("id")
      .eq("organization_id", access.organizationId)
      .eq("profile_id", access.userId)
      .single();
    if (personError || !person) {
      return actionFailure(
        "conflict",
        "No se encontró la ficha profesional vinculada.",
      );
    }
    const { error } = await supabase.from("leave_requests").insert({
      organization_id: access.organizationId,
      profile_id: access.userId,
      person_id: person.id,
      start_date: payload.startDate,
      end_date: payload.endDate,
      leave_type: payload.type,
      reason: payload.reason,
      status: "submitted",
    });

    if (error) {
      return actionFailure("conflict", "No se pudo registrar la solicitud.");
    }
    revalidatePath("/app/vacaciones");
    return actionSuccess();
  } catch (error) {
    return mapActionError(error);
  }
}

export async function transitionLeaveRequestAction(input: {
  requestId: string;
  status: "submitted" | "approved" | "rejected" | "cancelled";
  note: string;
}): Promise<ActionResult> {
  try {
    const payload = transitionSchema.parse(input);
    const access = await requirePermission(
      payload.status === "submitted"
        ? "vacations.requests.create"
        : "vacations.requests.approve",
    );
    const supabase = await createClient();
    const { error } = await supabase.rpc("transition_leave_request", {
      target_request_id: payload.requestId,
      target_status: payload.status,
      transition_note: payload.note,
      expected_organization_id: access.organizationId,
    });

    if (error) {
      return actionFailure(
        "conflict",
        "La solicitud cambió o la transición ya no está disponible.",
      );
    }
    revalidatePath("/app/vacaciones");
    return actionSuccess();
  } catch (error) {
    return mapActionError(error);
  }
}
