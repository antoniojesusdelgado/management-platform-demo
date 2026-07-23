import "server-only";

import type { PermissionCode } from "@/domain/permissions";
import { simulatedRoleAllows } from "@/domain/role-simulation";
import { getWorkspaceAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function requirePermission(permissionCode: PermissionCode) {
  const access = await getWorkspaceAccess();

  if (access.status !== "active") {
    throw new Error("Authentication required");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select(
      "role_id, roles!inner(role_permissions!inner(permissions!inner(code)))",
    )
    .eq("organization_id", access.organizationId)
    .eq("profile_id", access.userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error || !data) throw new Error("Membership unavailable");

  const role = data.roles as unknown as {
    role_permissions: Array<{
      permissions: { code: string } | Array<{ code: string }>;
    }>;
  };
  const permissionCodes = role.role_permissions.flatMap((assignment) => {
    const permissions = Array.isArray(assignment.permissions)
      ? assignment.permissions
      : [assignment.permissions];
    return permissions.map((permission) => permission.code);
  });

  if (!permissionCodes.includes(permissionCode)) {
    throw new Error("Permission denied");
  }
  if (
    access.simulatedRole &&
    !simulatedRoleAllows(access.simulatedRole, permissionCode)
  ) {
    throw new Error("Permission denied");
  }

  return access;
}

export async function hasWorkspacePermission(permissionCode: PermissionCode) {
  try {
    await requirePermission(permissionCode);
    return true;
  } catch {
    return false;
  }
}
