import { redirect } from "next/navigation";
import { ProfilePageClient } from "@/components/profile-page-client";
import type { UserProfile } from "@/domain/profile";
import { getWorkspaceAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const access = await getWorkspaceAccess();
  if (access.status !== "active") redirect("/login");

  const supabase = await createClient();
  const [profileResult, personResult, statusResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "display_name,alias,avatar_path,locale,timezone,theme,density,reduced_motion,high_contrast,default_dashboard,notification_preferences,simulated_role",
      )
      .eq("id", access.userId)
      .single(),
    supabase
      .from("people")
      .select("team,position_title,status,role_code")
      .eq("organization_id", access.organizationId)
      .eq("profile_id", access.userId)
      .single(),
    supabase.rpc("get_demo_workspace_status", {
      expected_organization_id: access.organizationId,
    }),
  ]);

  if (profileResult.error || personResult.error) redirect("/app/inicio");

  const notifications = profileResult.data.notification_preferences as {
    in_app?: boolean;
    assignments?: boolean;
    reviews?: boolean;
  };
  const signedAvatar = profileResult.data.avatar_path
    ? await supabase.storage
        .from("profile-avatars")
        .createSignedUrl(profileResult.data.avatar_path, 3600)
    : null;
  const profile: UserProfile = {
    displayName: profileResult.data.display_name,
    avatarPath: profileResult.data.avatar_path,
    avatarUrl: signedAvatar?.data?.signedUrl ?? null,
    alias: profileResult.data.alias,
    locale: profileResult.data.locale as UserProfile["locale"],
    timezone: profileResult.data.timezone as UserProfile["timezone"],
    theme: profileResult.data.theme as UserProfile["theme"],
    density: profileResult.data.density as UserProfile["density"],
    reducedMotion: profileResult.data.reduced_motion,
    highContrast: profileResult.data.high_contrast,
    defaultDashboard:
      profileResult.data.default_dashboard as UserProfile["defaultDashboard"],
    notificationPreferences: {
      inApp: notifications.in_app ?? true,
      assignments: notifications.assignments ?? true,
      reviews: notifications.reviews ?? true,
    },
    simulatedRole: profileResult.data.simulated_role,
  };
  const status = statusResult.data?.[0];

  return (
    <ProfilePageClient
      organizationName={access.organizationName}
      profile={profile}
      managed={{
        team: personResult.data.team,
        positionTitle: personResult.data.position_title,
        status: personResult.data.status,
        realRole: access.roleCode,
        availability:
          personResult.data.status === "active"
            ? "Disponible"
            : "No disponible",
      }}
      workspaceStatus={
        status
          ? {
              scenarioVersion: status.scenario_version,
              lastActiveAt: status.last_active_at,
              databaseSizeBytes: status.database_size_bytes,
              thresholdBytes: status.free_plan_read_only_threshold_bytes,
            }
          : null
      }
    />
  );
}
