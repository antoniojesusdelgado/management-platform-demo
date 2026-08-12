"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
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
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_AVATAR_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_AVATAR_OUTPUT_BYTES = 1024 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadOwnAvatarAction(formData: FormData): Promise<ActionResult<{ path: string; signedUrl: string }>> {
  const file = formData.get("avatar");
  if (!(file instanceof File) || !ALLOWED_AVATAR_MIME_TYPES.has(file.type) || file.size < 1 || file.size > MAX_AVATAR_INPUT_BYTES) {
    return actionFailure("validation_error", "Selecciona una imagen JPEG, PNG o WebP de hasta 10 MB.");
  }
  try {
    const access = await requirePermission("profile.self.update");
    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { failOn: "warning", limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
      return actionFailure("validation_error", "El archivo no contiene una imagen compatible.");
    }
    const output = await image.rotate().resize(512, 512, { fit: "cover", position: "centre" }).webp({ quality: 84 }).toBuffer();
    if (output.length > MAX_AVATAR_OUTPUT_BYTES) {
      return actionFailure("validation_error", "La imagen procesada supera el tamaño permitido.");
    }
    const supabase = await createClient();
    const nextPath = `${access.userId}/${randomUUID()}.webp`;
    const { data: profile } = await supabase.from("profiles").select("avatar_path").eq("id", access.userId).single();
    const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(nextPath, output, { contentType: "image/webp", cacheControl: "3600", upsert: false });
    if (uploadError) return actionFailure("conflict", "No se pudo guardar la imagen procesada.");
    const { error: profileError } = await supabase.rpc("set_own_avatar_path", { target_path: nextPath });
    if (profileError) {
      await supabase.storage.from("profile-avatars").remove([nextPath]);
      return actionFailure("conflict", "No se pudo actualizar la foto de perfil.");
    }
    if (profile?.avatar_path) await supabase.storage.from("profile-avatars").remove([profile.avatar_path]);
    const { data: signedAvatar, error: signedAvatarError } = await supabase.storage.from("profile-avatars").createSignedUrl(nextPath, 3600);
    if (signedAvatarError || !signedAvatar?.signedUrl) {
      return actionFailure("conflict", "La foto se guardó, pero no se pudo preparar su vista previa.");
    }
    revalidatePath("/app/perfil");
    return actionSuccess({ path: nextPath, signedUrl: signedAvatar.signedUrl });
  } catch {
    return actionFailure("validation_error", "La imagen está dañada o no se puede procesar de forma segura.");
  }
}

export async function removeOwnAvatarAction(): Promise<ActionResult> {
  try {
    const access = await requirePermission("profile.self.update");
    const supabase = await createClient();
    const { data: profile } = await supabase.from("profiles").select("avatar_path").eq("id", access.userId).single();
    const { error } = await supabase.rpc("clear_own_avatar_path");
    if (error) return actionFailure("conflict", "No se pudo eliminar la foto de perfil.");
    if (profile?.avatar_path) await supabase.storage.from("profile-avatars").remove([profile.avatar_path]);
    revalidatePath("/app/perfil");
    return actionSuccess();
  } catch {
    return actionFailure("permission_denied", "No tienes permiso para modificar este perfil.");
  }
}

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
        mentions: parsed.data.notificationPreferences.mentions,
        automations: parsed.data.notificationPreferences.automations,
        exports: parsed.data.notificationPreferences.exports,
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

export async function eraseOwnAccountAction(
  confirmation: string,
): Promise<ActionResult> {
  if (confirmation !== "ELIMINAR MI CUENTA") {
    return actionFailure("validation_error", "La confirmación no coincide.");
  }

  try {
    const access = await requirePermission("profile.self.update");
    const supabase = await createClient();
    const admin = createAdminClient();
    if (!admin) {
      return actionFailure(
        "unexpected_error",
        "La supresión no está disponible temporalmente. Contacta con soporte.",
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_path")
      .eq("id", access.userId)
      .maybeSingle();

    if (profile?.avatar_path) {
      const { error: avatarError } = await supabase.storage
        .from("profile-avatars")
        .remove([profile.avatar_path]);
      if (avatarError) {
        return actionFailure(
          "conflict",
          "No se pudo eliminar el avatar privado. La cuenta no se ha modificado.",
        );
      }
    }

    const { error: preparationError } = await supabase.rpc(
      "prepare_own_account_erasure_v1_8_2",
    );
    if (preparationError) {
      return actionFailure(
        "conflict",
        "No se pudo preparar la supresión. Tus datos no se han eliminado.",
      );
    }

    const { error: deletionError } = await admin.auth.admin.deleteUser(
      access.userId,
      true,
    );
    if (deletionError) {
      return actionFailure(
        "conflict",
        "La identidad se ha anonimizado, pero no pudo desactivarse. Contacta con soporte.",
      );
    }

    await supabase.auth.signOut();
    return actionSuccess();
  } catch {
    return actionFailure(
      "permission_denied",
      "No se pudo validar la identidad de la cuenta.",
    );
  }
}
