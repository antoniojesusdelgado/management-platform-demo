import { z } from "zod";
import { moduleIds, type ModuleId } from "@/domain/modules";
import { permissionCatalog, type PermissionCode } from "@/domain/permissions";
import { plainTextSchema } from "@/domain/validation";

export type ModuleSetting = {
  moduleId: ModuleId;
  enabled: boolean;
  sortOrder: number;
};

export type ConfigurableRole = {
  id: string;
  code: string;
  name: string;
  color: string;
  permissionCodes: PermissionCode[];
};

export const workspaceMembershipStatuses = ["invited", "active", "suspended"] as const;
export type WorkspaceMembershipStatus = (typeof workspaceMembershipStatuses)[number];

export type WorkspaceMembership = {
  id: string;
  personId: string;
  displayName: string;
  roleId: string;
  status: WorkspaceMembershipStatus;
};

export type WorkspaceInvitation = {
  id: string;
  email: string;
  roleId: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
};

export type AdminAuditEvent = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  actorName: string;
  summary: string;
  createdAt: string;
};

export const roleMetadataSchema = z.object({
  name: plainTextSchema({ min: 2, max: 60 }),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const rolePermissionsSchema = z.array(z.enum(permissionCatalog)).max(permissionCatalog.length);
export const invitationInputSchema = z.object({
  email: z.email().max(254),
  roleId: z.string().min(1),
});

export function createDefaultModuleSettings(): ModuleSetting[] {
  return moduleIds.map((moduleId, sortOrder) => ({ moduleId, enabled: true, sortOrder }));
}
