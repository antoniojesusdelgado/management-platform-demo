import { describe, expect, test } from "bun:test";
import { plainTextSchema } from "@/domain/validation";

describe("plainTextSchema", () => {
  const schema = plainTextSchema({ min: 2, max: 160 });

  test("normalizes valid text and preserves SQL punctuation as data", () => {
    expect(schema.parse("  O'Brien'); DROP TABLE people; --  ")).toBe(
      "O'Brien'); DROP TABLE people; --",
    );
    expect(schema.parse("Cafe\u0301")).toBe("Café");
  });

  test("rejects executable markup and control characters", () => {
    expect(schema.safeParse("<script>alert(1)</script>").success).toBe(false);
    expect(schema.safeParse('<img src=x onerror="alert(1)">').success).toBe(
      false,
    );
    expect(schema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(schema.safeParse("texto\u0000oculto").success).toBe(false);
  });
});
