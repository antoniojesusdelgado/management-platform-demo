"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { actionFailure, actionSuccess, type ActionResult } from "@/domain/action-result";
import {
  invitationTokenSchema,
  organizationDeletionSchema,
  organizationFounderProfileSchema,
  organizationSetupSchema,
} from "@/domain/organizations";
import { createClient } from "@/lib/supabase/server";

const organizationIdSchema = z.uuid();

type OrganizationRpc = (
  name: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");
  return supabase;
}

function failure(error: unknown): ActionResult<never> {
  if (error instanceof z.ZodError) {
    return actionFailure("validation_error", "Revisa los datos introducidos.");
  }
  if (error instanceof Error && error.message === "Authentication required") {
    return actionFailure("authentication_required", "La sesión ha caducado. Inicia sesión de nuevo.");
  }
  return actionFailure("unexpected_error", "No se pudo completar la operación.");
}

export async function createOrganizationAction(
  input: z.infer<typeof organizationSetupSchema>,
): Promise<ActionResult<{ organizationId: string }>> {
  try {
    const payload = organizationSetupSchema.parse(input);
    const supabase = await authenticatedClient();
    const rpc = supabase.rpc.bind(supabase) as unknown as OrganizationRpc;
    const { data, error } = await rpc("create_organization_v1_8", {
      target_name: payload.name,
      target_slug: payload.slug,
      target_template_mode: payload.templateMode,
    });
    if (error || typeof data !== "string") {
      return actionFailure("conflict", "No se pudo crear la empresa. Comprueba que el identificador sea único.");
    }
    if (payload.templateMode === "synthetic") {
      await supabase.rpc("restore_demo_scenario", {
        expected_organization_id: data,
        target_module: "all",
      });
    }
    (await cookies()).set("active-organization", data, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    revalidatePath("/app", "layout");
    return actionSuccess({ organizationId: data });
  } catch (error) {
    return failure(error);
  }
}

export async function switchActiveOrganizationAction(
  organizationId: string,
): Promise<ActionResult> {
  try {
    const target = organizationIdSchema.parse(organizationId);
    const supabase = await authenticatedClient();
    const rpc = supabase.rpc.bind(supabase) as unknown as OrganizationRpc;
    const { error } = await rpc("switch_active_organization_v1_8", {
      target_organization_id: target,
    });
    if (error) return actionFailure("permission_denied", "No tienes acceso a esa empresa.");
    (await cookies()).set("active-organization", target, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    revalidatePath("/app", "layout");
    return actionSuccess();
  } catch (error) {
    return failure(error);
  }
}

export async function completeOrganizationOnboardingAction(
  organizationId: string,
): Promise<ActionResult> {
  try {
    const target = organizationIdSchema.parse(organizationId);
    const supabase = await authenticatedClient();
    const rpc = supabase.rpc.bind(supabase) as unknown as OrganizationRpc;
    const { error } = await rpc("complete_organization_onboarding_v1_8", {
      target_organization_id: target,
    });
    if (error) return actionFailure("permission_denied", "No tienes permiso para completar la configuración.");
    revalidatePath("/app", "layout");
    return actionSuccess();
  } catch (error) {
    return failure(error);
  }
}

export async function completeFounderProfileAction(
  input: z.infer<typeof organizationFounderProfileSchema>,
): Promise<ActionResult> {
  try {
    const payload = organizationFounderProfileSchema.parse(input);
    const supabase = await authenticatedClient();
    const rpc = supabase.rpc.bind(supabase) as unknown as OrganizationRpc;
    const { error } = await rpc("complete_founder_profile_v1_8_3_hotfix_1", {
      target_organization_id: payload.organizationId,
      target_display_name: payload.displayName,
      target_team: payload.team,
      target_position_title: payload.positionTitle,
      target_contract_type: payload.employmentContractType,
      target_start_date: payload.employmentStartDate,
    });
    if (error) {
      return actionFailure("permission_denied", "No se pudo guardar tu ficha profesional.");
    }
    revalidatePath("/app", "layout");
    return actionSuccess();
  } catch (error) {
    return failure(error);
  }
}

export async function deleteOrganizationAction(
  input: z.infer<typeof organizationDeletionSchema>,
): Promise<ActionResult<{ nextOrganizationId: string | null }>> {
  try {
    const payload = organizationDeletionSchema.parse(input);
    const supabase = await authenticatedClient();
    const rpc = supabase.rpc.bind(supabase) as unknown as OrganizationRpc;
    const { data, error } = await rpc("delete_organization_v1_8_3_hotfix_1", {
      target_organization_id: payload.organizationId,
      confirmation_name: payload.confirmationName,
    });
    if (error || (data !== null && typeof data !== "string")) {
      return actionFailure(
        "permission_denied",
        "No se pudo eliminar la empresa. Comprueba el nombre y tus permisos.",
      );
    }
    const cookieStore = await cookies();
    if (typeof data === "string") {
      cookieStore.set("active-organization", data, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    } else {
      cookieStore.delete("active-organization");
    }
    revalidatePath("/app", "layout");
    return actionSuccess({ nextOrganizationId: typeof data === "string" ? data : null });
  } catch (error) {
    return failure(error);
  }
}

export async function acceptOrganizationInvitationAction(
  token: string,
): Promise<ActionResult<{ organizationId: string }>> {
  try {
    const value = invitationTokenSchema.parse(token);
    const supabase = await authenticatedClient();
    const rpc = supabase.rpc.bind(supabase) as unknown as OrganizationRpc;
    const { data, error } = await rpc("accept_organization_invitation_v1_8", {
      invitation_token: value,
    });
    if (error || typeof data !== "string") {
      return actionFailure("conflict", "La invitación no es válida, ha caducado o pertenece a otra cuenta.");
    }
    (await cookies()).set("active-organization", data, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    revalidatePath("/app", "layout");
    return actionSuccess({ organizationId: data });
  } catch (error) {
    return failure(error);
  }
}
