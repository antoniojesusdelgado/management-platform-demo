import type { PermissionCode } from "@/domain/permissions";
import type { PersonRoleCode } from "@/domain/people";

const collaboratorPermissions = new Set<PermissionCode>([
  "vacations.requests.view",
  "vacations.requests.create",
  "projects.items.view",
  "tasks.items.view",
  "tasks.items.create",
  "tasks.items.update_assigned",
  "incidents.tickets.view",
  "incidents.tickets.create",
  "incidents.tickets.update_assigned",
  "people.profiles.view",
  "changelog.entries.view",
  "analytics.dashboards.view",
  "integrations.runs.view",
  "profile.self.update",
]);

export function simulatedRoleAllows(
  role: PersonRoleCode,
  permission: PermissionCode,
) {
  if (role === "admin") return true;
  if (role === "manager") {
    return (
      permission !== "settings.workspace.manage" &&
      permission !== "payroll.runs.manage" &&
      permission !== "treasury.entries.manage"
    );
  }
  if (role === "collaborator") {
    return collaboratorPermissions.has(permission);
  }
  return permission.endsWith(".view") || permission === "profile.self.update";
}
