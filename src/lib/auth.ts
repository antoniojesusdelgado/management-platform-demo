import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ActiveOrganization } from "@/domain/organizations";

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
      organizations: ActiveOrganization[];
      onboardingComplete: boolean;
      onboardingStep: "company" | "people" | "suite" | "review" | "completed";
      isPlatformAdministrator: boolean;
    };

export const getWorkspaceAccess = cache(async (): Promise<WorkspaceAccess> => {
  if (!isSupabaseConfigured()) return { status: "not-configured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: "signed-out" };

  const [{ data: memberships }, { data: profile }] = await Promise.all([
    supabase
    .from("memberships")
    .select(
      "organization_id, roles!inner(code), organizations!inner(name,slug)",
    )
    .eq("profile_id", user.id)
    .eq("status", "active")
    .order("created_at"),
    supabase
      .from("profiles")
      .select("active_organization_id,simulated_role")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (!memberships?.length) {
    return { status: "not-invited", email: user.email ?? null };
  }

  const activeOrganizationCookie = (await cookies()).get("active-organization")?.value;
  const membership = memberships.find(
    (candidate) => candidate.organization_id === activeOrganizationCookie,
  ) ?? memberships.find(
    (candidate) => candidate.organization_id === profile?.active_organization_id,
  ) ?? memberships[0];
  const role = membership.roles as unknown as { code: string };
  const organization = membership.organizations as unknown as {
    name: string;
    slug: string;
  };
  const organizations = memberships.map((candidate) => {
    const candidateRole = candidate.roles as unknown as { code: string };
    const candidateOrganization = candidate.organizations as unknown as {
      name: string;
      slug: string;
    };
    return {
      id: candidate.organization_id,
      name: candidateOrganization.name,
      slug: candidateOrganization.slug,
      roleCode: candidateRole.code,
      active: candidate.organization_id === membership.organization_id,
    };
  });
  const platformAdminRpc = supabase.rpc.bind(supabase) as unknown as (
    name: "is_platform_administrator_v1_8_3_hotfix_1",
  ) => PromiseLike<{ data: boolean | null; error: { message: string } | null }>;
  const [{ data: onboarding }, { data: isPlatformAdministrator }] = await Promise.all([
    supabase
      .from("organization_onboarding")
      .select("status,current_step")
      .eq("organization_id", membership.organization_id)
      .maybeSingle(),
    platformAdminRpc("is_platform_administrator_v1_8_3_hotfix_1"),
  ]);
  const onboardingStep = onboarding?.current_step;
  const normalizedOnboardingStep = (
    ["company", "people", "suite", "review", "completed"] as const
  ).find((step) => step === onboardingStep) ?? "completed";

  return {
    status: "active",
    userId: user.id,
    email: user.email ?? null,
    organizationId: membership.organization_id,
    organizationName: organization.name,
    roleCode: role.code,
    simulatedRole: profile?.simulated_role ?? null,
    organizations,
    onboardingComplete: onboarding?.status === "completed",
    onboardingStep: normalizedOnboardingStep,
    isPlatformAdministrator: isPlatformAdministrator === true,
  };
});
