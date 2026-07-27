import { describe, expect, test } from "bun:test";
import { findUiCopyViolations } from "./validate-ui-copy";

describe("UI copy validation", () => {
  test.each([
    "Resumen ejecutivo",
    "Business Intelligence",
    "Throughput",
    "Headcount",
    "Backlog",
    "vs. anterior",
    "Operaciones premium",
  ])("rejects the expression %s", (expression) => {
    expect(
      findUiCopyViolations(
        `<p>${expression}</p>`,
        "src/components/example.tsx",
      ),
    ).not.toHaveLength(0);
  });

  test("rejects synthetic labels in operational content", () => {
    expect(
      findUiCopyViolations(
        'export const note = "Registro sintético creado";',
        "src/domain/guest-demo.ts",
      ),
    ).not.toHaveLength(0);
  });

  test("accepts the agreed natural alternatives", () => {
    expect(
      findUiCopyViolations(
        "<p>Resumen · Tareas completadas · Personas activas · Incidencias pendientes</p>",
        "src/components/example.tsx",
      ),
    ).toHaveLength(0);
  });

  test("rejects common UTF-8 corruption signatures", () => {
    expect(findUiCopyViolations("GestiÃ³n", "src/components/example.tsx")).not.toEqual([]);
    expect(findUiCopyViolations("Importe Â€", "src/components/example.tsx")).not.toEqual([]);
    expect(findUiCopyViolations("texto �", "src/components/example.tsx")).not.toEqual([]);
  });
});
