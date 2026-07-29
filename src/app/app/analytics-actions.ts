"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  AnalyticsFilter,
  AnalyticsSnapshot,
} from "@/domain/analytics";
import type { AnalyticsView } from "@/domain/analytics-engine";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/domain/action-result";
import { plainTextSchema } from "@/domain/validation";
import { requirePermission } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";

const analyticsFilterSchema = z.object({
  period: z.enum(["all", "30d", "90d", "6m", "12m"]),
  comparison: z.enum(["previous_period", "none"]),
  projectId: z.string().max(120).nullable(),
  team: plainTextSchema({ max: 120 }).nullable(),
  ownerId: z.string().max(120).nullable(),
  status: plainTextSchema({ max: 120 }).nullable(),
  service: plainTextSchema({ max: 160 }).nullable(),
});

const savedViewInputSchema = z.object({
  name: plainTextSchema({ min: 2, max: 80 }),
  filters: analyticsFilterSchema,
});

const analyticsViewSchema = z.enum([
  "executive",
  "work",
  "people",
  "service",
  "finance",
]);

export async function loadAnalyticsSnapshotAction(
  filters: AnalyticsFilter,
  view: AnalyticsView,
): Promise<AnalyticsSnapshot | null> {
  const parsedFilters = analyticsFilterSchema.safeParse(filters);
  const parsedView = analyticsViewSchema.safeParse(view);
  if (!parsedFilters.success || !parsedView.success) return null;

  try {
    const access = await requirePermission("analytics.dashboards.view");
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_analytics_snapshot", {
      expected_organization_id: access.organizationId,
      filter_period: parsedFilters.data.period,
      filter_project_id: parsedFilters.data.projectId ?? undefined,
      filter_team: parsedFilters.data.team ?? undefined,
      filter_owner_id: parsedFilters.data.ownerId ?? undefined,
      filter_status: parsedFilters.data.status ?? undefined,
      filter_service: parsedFilters.data.service ?? undefined,
      target_view: parsedView.data,
    });
    if (error || !data || typeof data !== "object" || Array.isArray(data)) {
      return null;
    }
    return data as unknown as AnalyticsSnapshot;
  } catch {
    return null;
  }
}

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
          filters: parsed.data.filters,
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
