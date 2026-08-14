import { redirect } from "next/navigation";
import { OrganizationOnboarding } from "@/components/organization-onboarding";
import { getWorkspaceAccess } from "@/lib/auth";

export default async function OrganizationOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string | string[] }>;
}) {
  const access = await getWorkspaceAccess();
  if (access.status === "signed-out") redirect("/login");
  if (access.status === "not-configured") redirect("/login?error=workspace");
  if (access.status === "active" && access.onboardingComplete) redirect("/app/inicio");

  const invite = (await searchParams).invite;
  return (
    <OrganizationOnboarding
      existingOrganizationId={access.status === "active" ? access.organizationId : undefined}
      initialProfileCompleted={
        access.status === "active" ? access.onboardingStep !== "people" : false
      }
      initialInvitationToken={typeof invite === "string" ? invite : undefined}
    />
  );
}
