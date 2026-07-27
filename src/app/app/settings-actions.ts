"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionFailure, actionSuccess, type ActionResult } from "@/domain/action-result";
import { moduleIds } from "@/domain/modules";
import { permissionCatalog, type PermissionCode } from "@/domain/permissions";
import { invitationInputSchema, roleMetadataSchema, workspaceMembershipStatuses, type WorkspaceMembershipStatus } from "@/domain/settings";
import { requirePermission } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";
import {
  workspaceConfigurationSchema,
  type WorkspaceConfiguration,
} from "@/domain/workspace-configuration";

const idSchema = z.uuid();
const moduleSchema = z.object({ moduleId: z.enum(moduleIds), enabled: z.boolean(), sortOrder: z.number().int().nonnegative().max(moduleIds.length - 1) });
const membershipSchema = z.object({ membershipId: idSchema, roleId: idSchema, status: z.enum(workspaceMembershipStatuses) });
function failure(error: unknown): ActionResult<never> {
  if (error instanceof z.ZodError) return actionFailure("validation_error", "Revisa los datos introducidos.");
  if (error instanceof Error && error.message === "Authentication required") return actionFailure("authentication_required", "La sesión ha caducado. Inicia sesión de nuevo.");
  if (error instanceof Error && error.message === "Permission denied") return actionFailure("permission_denied", "No tienes permiso para administrar la organización.");
  return actionFailure("unexpected_error", "No se pudo completar la operación.");
}

export async function renameOrganizationAction(name: string): Promise<ActionResult> {
  try {
    const value = z.string().trim().min(2).max(100).parse(name);
    const access = await requirePermission("settings.workspace.manage");
    const supabase = await createClient();
    const { error } = await supabase.from("organizations").update({ name: value, updated_at: new Date().toISOString() }).eq("id", access.organizationId);
    if (error) return actionFailure("conflict", "No se pudo actualizar la identidad.");
    revalidatePath("/app/configuracion"); return actionSuccess();
  } catch (error) { return failure(error); }
}

export async function updateModuleSettingAction(input: z.infer<typeof moduleSchema>): Promise<ActionResult> {
  try {
    const payload = moduleSchema.parse(input);
    if (payload.moduleId === "inicio" && !payload.enabled) throw new z.ZodError([]);
    const access = await requirePermission("settings.workspace.manage");
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_module_setting", { target_module_id: payload.moduleId, target_enabled: payload.enabled, target_sort_order: payload.sortOrder, expected_organization_id: access.organizationId });
    if (error) return actionFailure("conflict", "No se pudo actualizar el módulo.");
    revalidatePath("/app/configuracion"); return actionSuccess();
  } catch (error) { return failure(error); }
}

export async function updateRoleMetadataAction(roleId: string, name: string, color: string): Promise<ActionResult> {
  try {
    const id = idSchema.parse(roleId); const payload = roleMetadataSchema.parse({ name, color });
    const access = await requirePermission("settings.workspace.manage"); const supabase = await createClient();
    const { error } = await supabase.from("roles").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", id).eq("organization_id", access.organizationId);
    if (error) return actionFailure("conflict", "No se pudo actualizar el rol.");
    revalidatePath("/app/configuracion"); return actionSuccess();
  } catch (error) { return failure(error); }
}

export async function updateRolePermissionsAction(roleId: string, permissions: PermissionCode[]): Promise<ActionResult> {
  try {
    const id = idSchema.parse(roleId); const codes = z.array(z.enum(permissionCatalog)).parse(permissions);
    const access = await requirePermission("settings.workspace.manage"); const supabase = await createClient();
    const { error } = await supabase.rpc("update_role_permissions", { target_role_id: id, target_permission_codes: [...new Set(codes)], expected_organization_id: access.organizationId });
    if (error) return actionFailure("conflict", "No se pudieron actualizar los permisos.");
    revalidatePath("/app/configuracion"); return actionSuccess();
  } catch (error) { return failure(error); }
}

export async function createInvitationAction(email: string, roleId: string): Promise<ActionResult> {
  try {
    const payload = invitationInputSchema.parse({ email: email.toLowerCase(), roleId: idSchema.parse(roleId) });
    const access = await requirePermission("settings.workspace.manage");
    const token = crypto.randomUUID();
    const tokenHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)))).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const supabase = await createClient();
    const { error } = await supabase.from("invitations").insert({ organization_id: access.organizationId, email: payload.email, role_id: payload.roleId, token_hash: tokenHash, expires_at: new Date(Date.now() + 14 * 86_400_000).toISOString(), invited_by: access.userId });
    if (error) return actionFailure("conflict", "No se pudo crear la invitación.");
    revalidatePath("/app/configuracion"); return actionSuccess();
  } catch (error) { return failure(error); }
}

export async function updateMembershipAction(membershipId: string, roleId: string, status: WorkspaceMembershipStatus): Promise<ActionResult> {
  try {
    const payload = membershipSchema.parse({ membershipId, roleId, status });
    const access = await requirePermission("settings.workspace.manage"); const supabase = await createClient();
    const { error } = await supabase.rpc("update_membership_access", { target_membership_id: payload.membershipId, target_role_id: payload.roleId, target_status: payload.status, expected_organization_id: access.organizationId });
    if (error) return actionFailure("conflict", "No se pudo actualizar el acceso. No puedes modificar tu propia membresía.");
    revalidatePath("/app/configuracion"); return actionSuccess();
  } catch (error) { return failure(error); }
}

export async function updateWorkspaceConfigurationAction(
  configuration: WorkspaceConfiguration,
): Promise<ActionResult> {
  try {
    const payload = workspaceConfigurationSchema.parse(configuration);
    const access = await requirePermission("settings.workspace.manage");
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_workspace_configuration", {
      expected_organization_id: access.organizationId,
      configuration_payload: payload,
    });
    if (error)
      return actionFailure(
        "conflict",
        "No se pudieron actualizar las políticas de la organización.",
      );
    revalidatePath("/app/configuracion");
    return actionSuccess();
  } catch (error) {
    return failure(error);
  }
}

export async function restoreDemoScenarioV4Action(): Promise<ActionResult> {
  try {
    const access = await requirePermission("settings.workspace.manage");
    const supabase = await createClient();
    const { error: restoreError } = await supabase.rpc(
      "restore_demo_scenario",
      {
        expected_organization_id: access.organizationId,
        target_module: "all",
      },
    );
    if (restoreError)
      return actionFailure(
        "conflict",
        "No se pudieron restablecer los datos.",
      );
    revalidatePath("/app", "layout");
    return actionSuccess();
  } catch (error) {
    return failure(error);
  }
}
