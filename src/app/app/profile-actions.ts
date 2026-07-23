"use server";

import { revalidatePath } from "next/cache";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/domain/action-result";
import {
  profilePreferencesSchema,
  type ProfilePreferencesInput,
} from "@/domain/profile";
import { requirePermission } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";

export async function updateOwnProfileAction(
  input: ProfilePreferencesInput,
): Promise<ActionResult> {
  const parsed = profilePreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure(
      "validation_error",
      "Revisa las preferencias seleccionadas.",
    );
  }
  try {
    await requirePermission("profile.self.update");
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_own_profile_preferences", {
      target_alias: parsed.data.alias ?? "",
      target_locale: parsed.data.locale,
      target_timezone: parsed.data.timezone,
      target_theme: parsed.data.theme,
      target_density: parsed.data.density,
      target_reduced_motion: parsed.data.reducedMotion,
      target_high_contrast: parsed.data.highContrast,
      target_default_dashboard: parsed.data.defaultDashboard,
      target_notification_preferences: {
        in_app: parsed.data.notificationPreferences.inApp,
        assignments: parsed.data.notificationPreferences.assignments,
        reviews: parsed.data.notificationPreferences.reviews,
      },
      target_simulated_role: parsed.data.simulatedRole as
        | "admin"
        | "manager"
        | "collaborator"
        | "viewer",
    });
    if (error) {
      return actionFailure(
        "conflict",
        "No se pudieron actualizar las preferencias.",
      );
    }
    revalidatePath("/app/perfil");
    revalidatePath("/app/inicio");
    return actionSuccess();
  } catch {
    return actionFailure(
      "permission_denied",
      "No tienes permiso para modificar este perfil.",
    );
  }
}
