"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionFailure, actionSuccess, type ActionResult } from "@/domain/action-result";
import { personInputSchema, type PersonInput } from "@/domain/people";
import { requirePermission } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.uuid();

async function teamExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  team: string,
) {
  const { data, error } = await supabase
    .from("people")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("team", team)
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

function failure(error: unknown): ActionResult<never> {
  if (error instanceof z.ZodError) return actionFailure("validation_error", "Revisa los datos introducidos.");
  if (error instanceof Error && error.message === "Authentication required") return actionFailure("authentication_required", "La sesión ha caducado. Inicia sesión de nuevo.");
  if (error instanceof Error && error.message === "Permission denied") return actionFailure("permission_denied", "No tienes permiso para gestionar el directorio.");
  return actionFailure("unexpected_error", "No se pudo completar la operación.");
}

export async function createPersonAction(input: PersonInput): Promise<ActionResult> {
  try {
    const payload = personInputSchema.parse(input);
    const access = await requirePermission("people.profiles.manage");
    const supabase = await createClient();
    if (!(await teamExists(supabase, access.organizationId, payload.team))) {
      return actionFailure("validation_error", "Selecciona un equipo existente.");
    }
    const { error } = await supabase.from("people").insert({ organization_id: access.organizationId, display_name: payload.displayName, team: payload.team, position_title: payload.positionTitle, status: payload.status, role_code: payload.roleCode, manager_person_id: payload.managerPersonId, employment_contract_type: payload.employmentContractType, employment_start_date: payload.employmentStartDate, employment_end_date: payload.employmentEndDate });
    if (error) return actionFailure("conflict", "No se pudo añadir el perfil.");
    revalidatePath("/app/personal");
    return actionSuccess();
  } catch (error) { return failure(error); }
}

export async function updatePersonAction(id: string, input: PersonInput): Promise<ActionResult> {
  try {
    const personId = idSchema.parse(id);
    const payload = personInputSchema.parse(input);
    const access = await requirePermission("people.profiles.manage");
    const supabase = await createClient();
    if (!(await teamExists(supabase, access.organizationId, payload.team))) {
      return actionFailure("validation_error", "Selecciona un equipo existente.");
    }
    const { error } = await supabase.from("people").update({ display_name: payload.displayName, team: payload.team, position_title: payload.positionTitle, status: payload.status, role_code: payload.roleCode, manager_person_id: payload.managerPersonId, employment_contract_type: payload.employmentContractType, employment_start_date: payload.employmentStartDate, employment_end_date: payload.employmentEndDate, updated_at: new Date().toISOString() }).eq("id", personId).eq("organization_id", access.organizationId);
    if (error) return actionFailure("conflict", "No se pudo actualizar el perfil.");
    revalidatePath("/app/personal");
    return actionSuccess();
  } catch (error) { return failure(error); }
}
