import { describe, expect, test } from "bun:test";
import {
  organizationDeletionSchema,
  organizationFounderProfileSchema,
} from "@/domain/organizations";

describe("organization lifecycle validation", () => {
  test("accepts a complete founder profile", () => {
    const profile = organizationFounderProfileSchema.parse({
        organizationId: "11111111-1111-4111-8111-111111111111",
        displayName: "Antonio Delgado",
        team: "Dirección",
        positionTitle: "Administrador del sistema",
        employmentContractType: "indefinite_ordinary",
        employmentStartDate: "2026-08-14",
      });
    expect(profile.team).toBe("Dirección");
  });

  test("rejects control characters in founder fields", () => {
    expect(() =>
      organizationFounderProfileSchema.parse({
        organizationId: "11111111-1111-4111-8111-111111111111",
        displayName: "Antonio\u0000 Delgado",
        team: "Dirección",
        positionTitle: "Administrador",
        employmentContractType: "indefinite_ordinary",
        employmentStartDate: "2026-08-14",
      }),
    ).toThrow();
  });

  test("requires an explicit organization name for deletion", () => {
    expect(() =>
      organizationDeletionSchema.parse({
        organizationId: "11111111-1111-4111-8111-111111111111",
        confirmationName: " ",
      }),
    ).toThrow();
  });
});
