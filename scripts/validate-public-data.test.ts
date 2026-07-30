import { describe, expect, test } from "bun:test";

import { findPublicDataViolations } from "./validate-public-data";

describe("public data boundary detector", () => {
  test("accepts reserved synthetic email addresses", () => {
    expect(
      findPublicDataViolations("demo-owner@example.test", "fixture.sql"),
    ).toEqual([]);
  });

  test("rejects a non-reserved email address", () => {
    const violations = findPublicDataViolations(
      "person@example.com",
      "fixture.sql",
    );
    expect(violations.map((violation) => violation.code)).toContain(
      "real-email",
    );
  });

  test("rejects financial and identity-shaped identifiers", () => {
    const violations = findPublicDataViolations(
      ["ES1234567890123456789012", "12345678Z", "+34 612 345 678"].join(
        "\n",
      ),
      "fixture.sql",
    );
    expect(violations.map((violation) => violation.code)).toEqual([
      "spanish-iban",
      "spanish-tax-id",
      "spanish-phone",
    ]);
  });

  test("rejects real provider naming", () => {
    const violations = findPublicDataViolations(
      "BBVA, Santander and A3 Nóminas",
      "fixture.sql",
    );
    expect(
      violations.filter((violation) => violation.code === "restricted-provider"),
    ).toHaveLength(3);
  });

  test("distinguishes the service_role role name from secret material", () => {
    expect(
      findPublicDataViolations(
        "grant execute on function private.guard() to service_role;",
        "fixture.sql",
      ),
    ).toEqual([]);

    const violations = findPublicDataViolations(
      "SUPABASE_SECRET_KEY=sb_secret_example123",
      "fixture.env",
    );
    expect(violations.map((violation) => violation.code)).toContain(
      "secret-key",
    );
  });
});
