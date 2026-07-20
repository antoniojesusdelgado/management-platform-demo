import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
});

async function navigateToModule(
  page: Page,
  label: string,
  mobile: boolean,
) {
  if (mobile) {
    await page.getByRole("button", { name: "Abrir menú de módulos" }).click();
  }
  const navigation = page
    .getByRole("navigation", { name: "Módulos de la plataforma" })
    .filter({ visible: true });
  await navigation.getByRole("button", { name: label, exact: true }).click();
}

test("navigates through every module", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobile";
  for (const label of [
    "Vacaciones",
    "Tareas",
    "Incidencias",
    "Tesorería",
    "Nóminas",
    "Personal",
    "Novedades",
    "Configuración",
    "Inicio",
  ]) {
    await navigateToModule(page, label, mobile);
    await expect(page.getByRole("heading", { name: label, level: 1 })).toBeVisible();
  }
});

test("creates, approves and restores a leave request", async ({ page }, testInfo) => {
  await navigateToModule(
    page,
    "Vacaciones",
    testInfo.project.name === "mobile",
  );
  await page.getByRole("button", { name: "Nueva solicitud" }).click();
  await page.getByLabel("Fecha inicial").fill("2026-10-05");
  await page.getByLabel("Fecha final").fill("2026-10-07");
  await page.getByLabel("Motivo").fill("Solicitud sintética desde Playwright.");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();

  const row = page.getByRole("row").filter({ hasText: "Usuario invitado" });
  await expect(row).toContainText("Pendiente");
  await row.getByRole("button", { name: /Aprobar solicitud/ }).click();
  await expect(row).toContainText("Aprobada");

  await page.getByRole("button", { name: "Restaurar demo" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Usuario invitado" })).toHaveCount(0);
});

test("mobile navigation opens and closes with Escape", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.getByRole("button", { name: "Abrir menú de módulos" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: "Abrir menú de módulos" })).toBeFocused();
});
