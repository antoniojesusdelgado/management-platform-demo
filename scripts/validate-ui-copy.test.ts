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
    "límite WIP",
    "SLA vencido",
    "Bandeja administrativa",
    "settings.workspace.manage",
    "Sincronizar directorio",
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
        "<p>Resumen · Máximo de tareas · Personas activas · Fuera de plazo · Actualizar personas</p>",
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
