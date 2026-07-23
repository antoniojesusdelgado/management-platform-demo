"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProfileWorkspace } from "@/components/profile-workspace";
import type {
  ManagedProfileFields,
  UserProfile,
} from "@/domain/profile";

type Props = {
  organizationName: string;
  profile: UserProfile;
  managed: ManagedProfileFields;
  workspaceStatus: {
    scenarioVersion: number | null;
    lastActiveAt: string;
    databaseSizeBytes: number;
    thresholdBytes: number;
  } | null;
};

export function ProfilePageClient(props: Props) {
  const router = useRouter();
  return (
    <AppShell
      activeModule="inicio"
      organizationName={props.organizationName}
      mode="authenticated"
      onNavigate={(module) => router.push(`/app/${module}`)}
    >
      <ProfileWorkspace
        profile={props.profile}
        managed={props.managed}
        workspaceStatus={props.workspaceStatus}
      />
    </AppShell>
  );
}
