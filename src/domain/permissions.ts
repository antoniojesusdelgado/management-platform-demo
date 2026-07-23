export type PermissionAction = "view" | "create" | "update" | "approve" | "manage";

export type PermissionCode = `${string}.${string}.${PermissionAction}`;

export type WorkspaceRole = {
  id: string;
  code: string;
  name: string;
  color: string;
  permissionCodes: PermissionCode[];
};

export type Membership = {
  id: string;
  organizationId: string;
  profileId: string;
  roleId: string;
  status: "invited" | "active" | "suspended";
};

export const permissionCatalog = [
  "vacations.requests.view",
  "vacations.requests.create",
  "vacations.requests.approve",
  "tasks.items.view",
  "tasks.items.manage",
  "incidents.tickets.view",
  "incidents.tickets.manage",
  "treasury.entries.view",
  "treasury.entries.manage",
  "payroll.runs.view",
  "payroll.runs.manage",
  "people.profiles.view",
  "people.profiles.manage",
  "changelog.entries.view",
  "changelog.entries.manage",
  "settings.workspace.manage",
] as const satisfies readonly PermissionCode[];

export function hasPermission(
  role: WorkspaceRole,
  permission: PermissionCode,
): boolean {
  return role.permissionCodes.includes(permission);
}
