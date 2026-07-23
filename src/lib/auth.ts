import "server-only";

import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type WorkspaceAccess =
  | { status: "not-configured" }
  | { status: "signed-out" }
  | { status: "not-invited"; email: string | null }
  | {
      status: "active";
      userId: string;
      email: string | null;
      organizationId: string;
      organizationName: string;
      roleCode: string;
      simulatedRole: "admin" | "manager" | "collaborator" | "viewer" | null;
    };

export const getWorkspaceAccess = cache(async (): Promise<WorkspaceAccess> => {
  if (!isSupabaseConfigured()) return { status: "not-configured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: "signed-out" };

  const { data: membership } = await supabase
    .from("memberships")
    .select(
      "organization_id, roles!inner(code), organizations!inner(name), profiles!inner(simulated_role)",
    )
    .eq("profile_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { status: "not-invited", email: user.email ?? null };
  }

  const role = membership.roles as unknown as { code: string };
  const organization = membership.organizations as unknown as { name: string };
  const profile = membership.profiles as unknown as {
    simulated_role:
      | "admin"
      | "manager"
      | "collaborator"
      | "viewer"
      | null;
  };

  return {
    status: "active",
    userId: user.id,
    email: user.email ?? null,
    organizationId: membership.organization_id,
    organizationName: organization.name,
    roleCode: role.code,
    simulatedRole: profile.simulated_role,
  };
});
