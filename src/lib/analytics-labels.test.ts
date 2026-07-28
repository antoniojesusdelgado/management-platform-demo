import { describe, expect, test } from "bun:test";
import {
  formatAnalyticsAxisLabel,
  formatAnalyticsTableLabel,
  getMonthlyTickGap,
} from "./analytics-labels";

describe("analytics labels", () => {
  test("uses compact and unambiguous labels on monthly axes", () => {
    expect(formatAnalyticsAxisLabel("2025-01")).toBe("ene 25");
    expect(formatAnalyticsAxisLabel("2025-04")).toBe("abr");
    expect(formatAnalyticsAxisLabel("2026-01")).toBe("ene 26");
  });

  test("uses complete user-facing labels in tables and tooltips", () => {
    expect(formatAnalyticsTableLabel("2025-01")).toBe("Enero de 2025");
    expect(formatAnalyticsTableLabel("blocked")).toBe("Bloqueadas");
    expect(formatAnalyticsTableLabel("in_progress")).toBe("En curso");
  });

  test("adapts label spacing for 6, 12 and 19 months", () => {
    expect(getMonthlyTickGap(6)).toBe(20);
    expect(getMonthlyTickGap(12)).toBe(32);
    expect(getMonthlyTickGap(19)).toBe(44);
  });
});
