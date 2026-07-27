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

const savedViewInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  projectId: z.string().max(80).nullable(),
});

export async function saveAnalyticsViewAction(
  input: z.infer<typeof savedViewInputSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = savedViewInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure("validation_error", "Escribe un nombre válido.");
  }

  try {
    const access = await requirePermission("analytics.dashboards.view");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("saved_analytics_views")
      .upsert(
        {
          organization_id: access.organizationId,
          profile_id: access.userId,
          name: parsed.data.name,
          module_id: "analitica",
          filters: { projectId: parsed.data.projectId },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,profile_id,module_id,name" },
      )
      .select("id")
      .single();

    if (error || !data) {
      return actionFailure("conflict", "No se pudo guardar la vista.");
    }

    revalidatePath("/app/analitica");
    return actionSuccess({ id: data.id });
  } catch {
    return actionFailure(
      "permission_denied",
      "No tienes permiso para guardar vistas analíticas.",
    );
  }
}
