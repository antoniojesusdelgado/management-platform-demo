import { redirect } from "next/navigation";
import { OrganizationOnboarding } from "@/components/organization-onboarding";
import { getWorkspaceAccess } from "@/lib/auth";

export default async function NewOrganizationPage() {
  const access = await getWorkspaceAccess();
  if (access.status === "signed-out") redirect("/login");
  if (access.status === "not-configured") redirect("/login?error=workspace");
  if (access.status === "not-invited") redirect("/app/onboarding");

  return (
    <OrganizationOnboarding
      creationOnly
      cancelHref="/app/inicio"
    />
  );
}
