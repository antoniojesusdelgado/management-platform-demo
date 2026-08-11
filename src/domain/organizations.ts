import { z } from "zod";
import { plainTextSchema } from "@/domain/validation";

export const signInProviders = ["google", "azure"] as const;
export const onboardingSteps = ["company", "people", "suite", "review", "completed"] as const;
export const directorySyncStatuses = ["not_configured", "ready", "syncing", "error", "paused"] as const;
export const directoryJobStatuses = ["pending", "running", "succeeded", "partial", "failed"] as const;

export type SignInProvider = (typeof signInProviders)[number];
export type OrganizationOnboardingState = {
  status: "in_progress" | "completed";
  currentStep: (typeof onboardingSteps)[number];
  templateMode: "empty" | "synthetic";
  completedAt: string | null;
};

export type ActiveOrganization = {
  id: string;
  name: string;
  slug: string;
  roleCode: string;
  active: boolean;
};

export type DirectorySyncPolicy = {
  provider: "google_workspace" | "microsoft_365" | null;
  status: (typeof directorySyncStatuses)[number];
  syncIntervalMinutes: number;
  teamMapping: Record<string, string>;
  lastSyncedAt: string | null;
  lastErrorCode: string | null;
};

export type DirectorySyncCursor = {
  provider: "google_workspace" | "microsoft_365";
  cursor: string | null;
  fullSyncCompleted: boolean;
  lastSyncedAt: string | null;
};

export type DirectoryIdentityLink = {
  id: string;
  personId: string | null;
  provider: "google_workspace" | "microsoft_365";
  externalId: string;
  primaryEmail: string;
  displayName: string;
  externalTeam: string | null;
  status: "active" | "suspended" | "deleted";
  lastSeenAt: string;
};

export type DirectorySyncJob = {
  id: string;
  provider: "google_workspace" | "microsoft_365";
  trigger: "scheduled" | "manual" | "initial";
  status: (typeof directoryJobStatuses)[number];
  processedCount: number;
  createdCount: number;
  updatedCount: number;
  deactivatedCount: number;
  errorCode: string | null;
  createdAt: string;
};

export const organizationSetupSchema = z.object({
  name: plainTextSchema({ min: 2, max: 100 }),
  slug: z.string().trim().min(2).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  templateMode: z.enum(["empty", "synthetic"]),
});

export const invitationTokenSchema = z.string().trim().min(16).max(200);
