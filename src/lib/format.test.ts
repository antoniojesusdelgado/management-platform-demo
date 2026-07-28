import { describe, expect, test } from "bun:test";
import {
  formatCurrency,
  formatAnalyticsValue,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "@/lib/format";

describe("Spanish product formatters", () => {
  test("uses consistent currency, number and percentage formats", () => {
    expect(formatCurrency(1_418_014)).toBe("14.180,14 €");
    expect(formatNumber(14_180)).toBe("14.180");
    expect(formatPercent(16.8)).toBe("16,8 %");
  });

  test("formats dates and times using Spanish conventions", () => {
    expect(formatDate("2026-06-23")).toContain("23 jun 2026");
    expect(formatDateTime("2026-06-23T12:30:00+02:00")).toContain("23 jun 2026");
  });

  test("formats analytics values according to their semantic unit", () => {
    expect(formatAnalyticsValue(79.166_666, "percentage")).toBe(
      "79,17\u00a0%",
    );
    expect(formatAnalyticsValue(831_600, "currency")).toBe(
      "8.316,00\u00a0\u20ac",
    );
    expect(formatAnalyticsValue(2.345, "days")).toBe("2,35 d\u00edas");
    expect(formatAnalyticsValue(14.2, "count")).toBe("14");
  });
});
