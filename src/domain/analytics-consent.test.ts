import { describe, expect, test } from "bun:test";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  analyticsConsentSchema,
  hasAcceptedAnalyticsConsent,
} from "./analytics-consent";

describe("analytics consent", () => {
  test("accepts only explicit choices", () => {
    expect(analyticsConsentSchema.parse("accepted")).toBe("accepted");
    expect(analyticsConsentSchema.parse("rejected")).toBe("rejected");
    expect(analyticsConsentSchema.safeParse("pending").success).toBe(false);
  });

  test("uses a versioned storage key", () => {
    expect(ANALYTICS_CONSENT_STORAGE_KEY).toEndWith(":v1");
  });

  test("enables analytics only after explicit acceptance", () => {
    expect(hasAcceptedAnalyticsConsent("accepted")).toBe(true);
    expect(hasAcceptedAnalyticsConsent("rejected")).toBe(false);
    expect(hasAcceptedAnalyticsConsent(null)).toBe(false);
    expect(hasAcceptedAnalyticsConsent("pending")).toBe(false);
  });
});
