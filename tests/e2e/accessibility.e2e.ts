import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("guest dashboard has no detectable WCAG A/AA violations", async ({
  page,
}) => {
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("leave dialog has no detectable WCAG A/AA violations", async (
  { page },
  testInfo,
) => {
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
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
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Abrir menú de módulos" }).click();
  }
  const navigation = page
    .getByRole("navigation", { name: "Módulos de la plataforma" })
    .filter({ visible: true });
  await navigation
    .getByRole("button", { name: "Vacaciones", exact: true })
    .click();
  await page
    .getByRole("row")
    .filter({ hasText: "Marta Soler" })
    .getByRole("button", { name: /Ver detalle/ })
    .click();
  await expect(page.getByRole("dialog", { name: "Marta Soler" })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("leave transition confirmation has no detectable WCAG A/AA violations", async (
  { page },
  testInfo,
) => {
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Abrir menú de módulos" }).click();
  }
  const navigation = page
    .getByRole("navigation", { name: "Módulos de la plataforma" })
    .filter({ visible: true });
  await navigation
    .getByRole("button", { name: "Vacaciones", exact: true })
    .click();
  await page
    .getByRole("row")
    .filter({ hasText: "Elena Martín" })
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
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Abrir menú de módulos" }).click();
  }
  const navigation = page
    .getByRole("navigation", { name: "Módulos de la plataforma" })
    .filter({ visible: true });
  await navigation.getByRole("button", { name: "Tareas", exact: true }).click();
  await page.getByRole("button", { name: /Preparar el informe semanal/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Preparar el informe semanal" }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
