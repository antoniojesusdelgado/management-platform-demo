import { z } from "zod";
import { personRoleCodes, type PersonRoleCode } from "@/domain/people";
import { plainTextSchema } from "@/domain/validation";

export const profileLocales = ["es-ES", "en-GB"] as const;
export const profileTimezones = [
  "Europe/Madrid",
  "Europe/London",
  "Atlantic/Canary",
  "UTC",
] as const;
export const profileThemes = ["light", "dark"] as const;
export const profileDensities = ["comfortable", "compact"] as const;
export const profileDashboards = [
  "analytics",
  "projects",
  "tasks",
  "vacations",
] as const;

export type UserProfile = {
  displayName: string;
  alias: string | null;
  locale: (typeof profileLocales)[number];
  timezone: (typeof profileTimezones)[number];
  theme: (typeof profileThemes)[number];
  density: (typeof profileDensities)[number];
  reducedMotion: boolean;
  highContrast: boolean;
  defaultDashboard: (typeof profileDashboards)[number];
  notificationPreferences: {
    inApp: boolean;
    assignments: boolean;
    reviews: boolean;
  };
  simulatedRole: PersonRoleCode | null;
  avatarPath: string | null;
  avatarUrl: string | null;
};

export type ManagedProfileFields = {
  team: string;
  positionTitle: string;
  status: string;
  realRole: string;
  availability: string;
};

export const profilePreferencesSchema = z.object({
  alias: plainTextSchema({ min: 2, max: 80 }).nullable(),
  locale: z.enum(profileLocales),
  timezone: z.enum(profileTimezones),
  theme: z.enum(profileThemes),
  density: z.enum(profileDensities),
  reducedMotion: z.boolean(),
  highContrast: z.boolean(),
  defaultDashboard: z.enum(profileDashboards),
  notificationPreferences: z.object({
    inApp: z.boolean(),
    assignments: z.boolean(),
    reviews: z.boolean(),
  }),
  simulatedRole: z.enum(personRoleCodes).nullable(),
});

export type ProfilePreferencesInput = z.infer<
  typeof profilePreferencesSchema
>;
