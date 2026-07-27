import { z } from "zod";

export const workspaceConfigurationSchema = z.object({
  appearance: z.object({
    accent: z.enum(["indigo", "teal", "navy"]),
    density: z.enum(["comfortable", "compact"]),
    radius: z.enum(["small", "medium", "large"]),
  }),
  calendar: z.object({
    country: z.enum(["ES", "PT", "FR"]),
    weekStartsOn: z.union([z.literal(0), z.literal(1)]),
    syntheticHolidays: z.boolean(),
  }),
  vacations: z.object({
    annualAllowanceDays: z.number().int().min(20).max(35),
    minimumNoticeDays: z.number().int().min(0).max(60),
    overlapWarningCount: z.number().int().min(1).max(10),
  }),
  tasks: z.object({
    pendingWip: z.number().int().min(5).max(100),
    inProgressWip: z.number().int().min(2).max(50),
    reviewWip: z.number().int().min(1).max(30),
  }),
  incidents: z.object({
    criticalSlaHours: z.number().int().min(1).max(24),
    highSlaHours: z.number().int().min(2).max(72),
    mediumSlaHours: z.number().int().min(4).max(168),
  }),
  treasury: z.object({
    currency: z.enum(["EUR", "USD", "GBP"]),
    autoReconcileConfidence: z.number().int().min(50).max(100),
    marginWarningPercent: z.number().int().min(1).max(40),
  }),
  payroll: z.object({
    variationWarningPercent: z.number().int().min(1).max(30),
    headcountWarning: z.number().int().min(1).max(20),
  }),
  integrations: z.object({
    scheduleUtc: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    retryLimit: z.number().int().min(0).max(5),
    notifyOnPartial: z.boolean(),
  }),
  analytics: z.object({
    projectRiskThreshold: z.number().int().min(1).max(100),
    slaTargetPercent: z.number().int().min(50).max(100),
    cashMarginTargetPercent: z.number().int().min(1).max(40),
  }),
});

export type WorkspaceConfiguration = z.infer<
  typeof workspaceConfigurationSchema
>;

export const defaultWorkspaceConfiguration: WorkspaceConfiguration = {
  appearance: {
    accent: "indigo",
    density: "comfortable",
    radius: "medium",
  },
  calendar: {
    country: "ES",
    weekStartsOn: 1,
    syntheticHolidays: true,
  },
  vacations: {
    annualAllowanceDays: 23,
    minimumNoticeDays: 7,
    overlapWarningCount: 2,
  },
  tasks: {
    pendingWip: 40,
    inProgressWip: 12,
    reviewWip: 8,
  },
  incidents: {
    criticalSlaHours: 4,
    highSlaHours: 12,
    mediumSlaHours: 48,
  },
  treasury: {
    currency: "EUR",
    autoReconcileConfidence: 90,
    marginWarningPercent: 8,
  },
  payroll: {
    variationWarningPercent: 8,
    headcountWarning: 2,
  },
  integrations: {
    scheduleUtc: "02:15",
    retryLimit: 2,
    notifyOnPartial: true,
  },
  analytics: {
    projectRiskThreshold: 70,
    slaTargetPercent: 92,
    cashMarginTargetPercent: 12,
  },
};

export function parseWorkspaceConfiguration(
  value: unknown,
): WorkspaceConfiguration {
  const parsed = workspaceConfigurationSchema.safeParse(value);
  return parsed.success ? parsed.data : structuredClone(defaultWorkspaceConfiguration);
}
