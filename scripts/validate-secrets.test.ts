import { describe, expect, test } from "bun:test";
import { scanText } from "./validate-secrets";

describe("secret validation", () => {
  test("detects high-risk credentials without returning their values", () => {
    const findings = scanText(
      "fixture",
      [
        ["sb", "secret"].join("_") + "_" + "a".repeat(24),
        ["sk", "live"].join("_") + "_" + "b".repeat(24),
        [
          "NEXT",
          "PUBLIC",
          "SUPABASE",
          "SERVICE",
          "ROLE",
          "KEY=value",
        ].join("_"),
      ].join("\n"),
    );

    expect(findings.map((finding) => finding.kind)).toEqual([
      "Supabase secret key",
      "Stripe live secret",
      "server secret exposed through NEXT_PUBLIC_",
    ]);
    expect(JSON.stringify(findings)).not.toContain("a".repeat(24));
  });

  test("allows publishable configuration and placeholders", () => {
    expect(
      scanText(
        ".env.example",
        [
          "NEXT_PUBLIC_SUPABASE_URL=",
          "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=",
          "PORTFOLIO_ORIGIN=",
        ].join("\n"),
      ),
    ).toEqual([]);
  });
});
