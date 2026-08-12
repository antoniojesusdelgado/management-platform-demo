import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function openGuestDemo(page: Page) {
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
  const analyticsDialog = page.getByRole("dialog", { name: "Analítica opcional" });
  if (await analyticsDialog.isVisible()) {
    await analyticsDialog.getByRole("button", { name: "Rechazar" }).click();
  }
}

async function openModule(page: Page, label: string) {
  const mobileNavigation = page.getByRole("navigation", {
    name: "Navegación móvil",
  });
  if (await mobileNavigation.isVisible()) {
    const directLabel =
      label === "Personal" ? "Personas" : label === "Analítica" ? "Analítica" : null;
    if (directLabel) {
      await mobileNavigation.getByRole("button", { name: directLabel, exact: true }).click();
      return;
    }
    await mobileNavigation.getByRole("button", { name: "Más", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Todos los módulos" })
      .getByRole("button", { name: label, exact: true })
      .click();
    return;
  }

  if (["Personal", "Analítica", "Configuración", "Inicio"].includes(label)) {
    const directLabel = label === "Personal" ? "Personas" : label;
    await page.getByRole("button", { name: directLabel, exact: true }).click();
    return;
  }
  await page.getByRole("button", { name: /Trabajo/ }).click();
  await page.getByRole("menuitem", { name: label, exact: true }).click();
}

test("guest dashboard has no detectable WCAG A/AA violations", async ({
  page,
}) => {
  await openGuestDemo(page);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("workspace command center has no detectable WCAG A/AA violations", async ({ page }) => {
  await openGuestDemo(page);
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Bandeja de trabajo" });
  await dialog.getByRole("searchbox").fill("soporte");
  await expect(dialog.locator(".workspace-command-item").first()).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("leave dialog has no detectable WCAG A/AA violations", async (
  { page },
) => {
  await openGuestDemo(page);
  await openModule(page, "Vacaciones");
  await page.getByRole("button", { name: "Nueva solicitud" }).click();
  await expect(page.getByRole("dialog", { name: "Nueva solicitud" })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("leave detail has no detectable WCAG A/AA violations", async (
  { page },
) => {
  await openGuestDemo(page);
  await openModule(page, "Vacaciones");
  await page.getByRole("button", { name: /Ver detalle/ }).first().click();
  await expect(page.locator('[role="dialog"]:visible')).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("leave transition confirmation has no detectable WCAG A/AA violations", async (
  { page },
) => {
  await openGuestDemo(page);
  await openModule(page, "Vacaciones");
  await page.getByRole("button", { name: "Nueva solicitud" }).click();
  await page.getByLabel("Fecha inicial").fill("2026-10-05");
  await page.getByLabel("Fecha final").fill("2026-10-07");
  await page.getByLabel("Motivo").fill("Control de accesibilidad sintético.");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "Usuario invitado" })
    .getByRole("button", { name: /Rechazar solicitud/ })
    .click();
  await expect(
    page.getByRole("alertdialog", { name: "Rechazar solicitud" }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("task detail has no detectable WCAG A/AA violations", async (
  { page },
) => {
  await openGuestDemo(page);
  await openModule(page, "Tareas");
  await page
    .getByRole("button", { name: "Lista", exact: true })
    .click({ force: true });
  await page.locator(".task-row").first().click();
  await expect(page.locator('[role="dialog"]:visible')).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("incident detail has no detectable WCAG A/AA violations", async ({ page }) => {
  await openGuestDemo(page);
  await openModule(page, "Incidencias");
  await page.locator(".task-row").first().click();
  await expect(page.locator('[role="dialog"]:visible')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("settings permission matrix has no detectable WCAG A/AA violations", async ({ page }) => {
  await openGuestDemo(page);
  await openModule(page, "Configuración");
  await page.getByRole("button", { name: "Roles y permisos" }).click();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("Treasury creation has no detectable WCAG A/AA violations", async ({ page }) => {
  test.setTimeout(90_000);
  await openGuestDemo(page);
  await openModule(page, "Tesorería");
  await page.getByRole("button", { name: "Nuevo movimiento" }).click();
  await expect(page.getByRole("dialog", { name: "Nuevo movimiento" })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("Payroll creation has no detectable WCAG A/AA violations", async ({ page }) => {
  test.setTimeout(90_000);
  await openGuestDemo(page);
  await openModule(page, "Nóminas");
  await page.getByRole("button", { name: "Nuevo ciclo" }).click();
  await expect(page.getByRole("dialog", { name: "Nuevo ciclo" })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
});
