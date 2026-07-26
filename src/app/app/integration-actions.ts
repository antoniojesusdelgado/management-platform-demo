"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/domain/action-result";
import { requirePermission } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";

export async function simulateIntegrationAction(
  connectorId: string,
): Promise<ActionResult<{ runId: string }>> {
  const parsed = z.uuid().safeParse(connectorId);
  if (!parsed.success) {
    return actionFailure("validation_error", "El conector no es válido.");
  }
  try {
    const access = await requirePermission("integrations.runs.manage");
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("simulate_integration_run", {
      expected_connector_id: parsed.data,
      expected_organization_id: access.organizationId,
    });
    if (error || !data) {
      return actionFailure(
        "conflict",
        "No se pudo completar la simulación.",
      );
    }
    revalidatePath("/app/tesoreria");
    revalidatePath("/app/nominas");
    revalidatePath("/app/personal");
    revalidatePath("/app/centro-control");
    return actionSuccess({ runId: data });
  } catch {
    return actionFailure(
      "permission_denied",
      "No tienes permiso para ejecutar integraciones.",
    );
  }
}
