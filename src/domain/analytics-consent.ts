import { z } from "zod";

export const ANALYTICS_CONSENT_STORAGE_KEY =
  "management-platform-analytics-consent:v1";

export const analyticsConsentSchema = z.enum(["accepted", "rejected"]);

export type AnalyticsConsent = z.infer<typeof analyticsConsentSchema>;
