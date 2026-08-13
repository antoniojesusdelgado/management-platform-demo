import { describe, expect, test } from "bun:test";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  analyticsConsentSchema,
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
});
