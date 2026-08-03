import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function openGuestDemo(page: Page) {
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Explorar demo sin registro" }).click();
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
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

test("leave dialog has no detectable WCAG A/AA violations", async (
  { page },
  testInfo,
) => {
  await openGuestDemo(page);
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Abrir menú de módulos" }).click();
  }
  const navigation = page
    .getByRole("navigation", { name: "Módulos de la plataforma" })
    .filter({ visible: true });
  await navigation
    .getByRole("button", { name: "Vacaciones", exact: true })
    .click();
  await page.getByRole("button", { name: "Nueva solicitud" }).click();
  await expect(page.getByRole("dialog", { name: "Nueva solicitud" })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("leave detail has no detectable WCAG A/AA violations", async (
  { page },
  testInfo,
) => {
  await openGuestDemo(page);
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Abrir menú de módulos" }).click();
  }
  const navigation = page
    .getByRole("navigation", { name: "Módulos de la plataforma" })
    .filter({ visible: true });
  await navigation
    .getByRole("button", { name: "Vacaciones", exact: true })
    .click();
  await page.getByRole("button", { name: /Ver detalle/ }).first().click();
  await expect(page.locator('[role="dialog"]:visible')).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("leave transition confirmation has no detectable WCAG A/AA violations", async (
  { page },
  testInfo,
) => {
  await openGuestDemo(page);
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Abrir menú de módulos" }).click();
  }
  const navigation = page
    .getByRole("navigation", { name: "Módulos de la plataforma" })
    .filter({ visible: true });
  await navigation
    .getByRole("button", { name: "Vacaciones", exact: true })
    .click();
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
  testInfo,
) => {
  await openGuestDemo(page);
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Abrir menú de módulos" }).click();
  }
  const navigation = page
    .getByRole("navigation", { name: "Módulos de la plataforma" })
    .filter({ visible: true });
  await navigation.getByRole("button", { name: "Tareas", exact: true }).click();
  if (testInfo.project.name === "mobile") {
    await expect(page.getByRole("dialog", { name: "Módulos" })).toBeHidden();
  }
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

test("incident detail has no detectable WCAG A/AA violations", async ({ page }, testInfo) => {
  await openGuestDemo(page);
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Abrir menú de módulos" }).click();
  const navigation = page.getByRole("navigation", { name: "Módulos de la plataforma" }).filter({ visible: true });
  await navigation.getByRole("button", { name: "Incidencias", exact: true }).click();
  await page.locator(".task-row").first().click();
  await expect(page.locator('[role="dialog"]:visible')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("settings permission matrix has no detectable WCAG A/AA violations", async ({ page }, testInfo) => {
  await openGuestDemo(page);
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Abrir menú de módulos" }).click();
  const navigation = page.getByRole("navigation", { name: "Módulos de la plataforma" }).filter({ visible: true });
  await navigation.getByRole("button", { name: "Configuración", exact: true }).click();
  await page.getByRole("button", { name: "Roles y permisos" }).click();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("Treasury creation has no detectable WCAG A/AA violations", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await openGuestDemo(page);
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Abrir menú de módulos" }).click();
  const navigation = page.getByRole("navigation", { name: "Módulos de la plataforma" }).filter({ visible: true });
  await navigation.getByRole("button", { name: "Tesorería", exact: true }).click();
  await page.getByRole("button", { name: "Nuevo movimiento" }).click();
  await expect(page.getByRole("dialog", { name: "Nuevo movimiento" })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("Payroll creation has no detectable WCAG A/AA violations", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await openGuestDemo(page);
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Abrir menú de módulos" }).click();
  const navigation = page.getByRole("navigation", { name: "Módulos de la plataforma" }).filter({ visible: true });
  await navigation.getByRole("button", { name: "Nóminas", exact: true }).click();
  await page.getByRole("button", { name: "Nuevo ciclo" }).click();
  await expect(page.getByRole("dialog", { name: "Nuevo ciclo" })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
});
