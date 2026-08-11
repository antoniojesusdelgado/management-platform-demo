import { describe, expect, test } from "bun:test";
import { buildProfessionalGreeting } from "@/lib/greeting";

describe("buildProfessionalGreeting", () => {
  test("preserva nombres compuestos por la mañana", () => {
    expect(buildProfessionalGreeting(new Date("2026-08-11T07:00:00Z"), "Europe/Madrid", "Antonio Jesús"))
      .toBe("Buenos días, Antonio Jesús");
  });

  test("cambia a tarde a las doce en la zona profesional", () => {
    expect(buildProfessionalGreeting(new Date("2026-08-11T10:30:00Z"), "Europe/Madrid", "Lucía"))
      .toBe("Buenas tardes, Lucía");
  });

  test("usa la noche fuera del horario diurno", () => {
    expect(buildProfessionalGreeting(new Date("2026-08-11T21:00:00Z"), "Europe/Madrid", null))
      .toBe("Buenas noches");
  });
});
