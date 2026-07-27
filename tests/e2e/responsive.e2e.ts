import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { width: 320, height: 768 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 768 },
  { width: 1024, height: 800 },
  { width: 1440, height: 900 },
] as const;

const modules = [
  "Vacaciones",
  "Analítica",
  "Proyectos",
  "Tareas",
  "Incidencias",
  "Tesorería",
  "Nóminas",
  "Personal",
  "Novedades",
  "Configuración",
] as const;

async function expectNoGlobalHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll<HTMLElement>("body *")]
      .map((element) => ({
        className: element.className,
        tagName: element.tagName,
        right: Math.round(element.getBoundingClientRect().right),
        width: Math.round(element.getBoundingClientRect().width),
      }))
      .filter(
        ({ right, width }) =>
          width > 0 && right > document.documentElement.clientWidth + 1,
      )
      .sort((left, right) => right.right - left.right)
      .slice(0, 8),
    kanban: (() => {
      const columns = document.querySelector<HTMLElement>(".kanban-columns");
      const board = document.querySelector<HTMLElement>(".kanban-board");
      if (!columns || !board) return null;
      return {
        board: {
          width: Math.round(board.getBoundingClientRect().width),
          right: Math.round(board.getBoundingClientRect().right),
          overflow: getComputedStyle(board).overflow,
        },
        columns: {
          display: getComputedStyle(columns).display,
          width: Math.round(columns.getBoundingClientRect().width),
          right: Math.round(columns.getBoundingClientRect().right),
          scrollWidth: columns.scrollWidth,
          overflowX: getComputedStyle(columns).overflowX,
        },
      };
    })(),
  }));
  expect(
    dimensions.scrollWidth,
    JSON.stringify({ offenders: dimensions.offenders, kanban: dimensions.kanban }),
  ).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function openModule(
  page: Page,
  moduleName: (typeof modules)[number],
) {
  const menuButton = page.getByRole("button", {
    name: "Abrir menú de módulos",
  });
  if (await menuButton.isVisible()) {
    await menuButton.click();
  }
  const navigation = page
    .getByRole("navigation", { name: "Módulos de la plataforma" })
    .filter({ visible: true });
  await navigation
    .getByRole("button", { name: moduleName, exact: true })
    .click();
  await expect(page.getByRole("heading", { name: moduleName, level: 1 })).toBeVisible();
}

test("access and every module avoid global horizontal overflow at release sizes", async (
  { page },
  testInfo,
) => {
  test.skip(testInfo.project.name !== "chromium");
  test.setTimeout(180_000);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Gestión diaria en un solo lugar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Probar sin iniciar sesión" })).toBeVisible();
    await expectNoGlobalHorizontalOverflow(page);

    await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
    await expectNoGlobalHorizontalOverflow(page);

    for (const moduleName of modules) {
      await openModule(page, moduleName);
      await expectNoGlobalHorizontalOverflow(page);
    }
  }
});

test("desktop sidebar keeps its geometry while a scrolled detail dialog is open", async (
  { page },
  testInfo,
) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
  await openModule(page, "Vacaciones");

  const sidebar = page.locator(".sidebar");
  const appMain = page.locator(".app-main");
  const before = await sidebar.boundingBox();
  await appMain.evaluate((element) => {
    element.scrollTop = 600;
  });
  await page.getByRole("button", { name: /Ver detalle/ }).first().click();
  await expect(page.locator('[role="dialog"]:visible')).toBeVisible();
  const during = await sidebar.boundingBox();

  expect(during).toEqual(before);
  await expect(sidebar).toHaveCSS("height", "900px");
});

test("mobile filters, tables, Kanban and dialogs stay inside their panels", async (
  { page },
  testInfo,
) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.setViewportSize({ width: 320, height: 768 });
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();

  await openModule(page, "Vacaciones");
  const tableContainer = page.locator(".data-table-wrap").first();
  await expect(tableContainer).toBeVisible();
  await expect(tableContainer.locator("thead")).toBeVisible();
  await expectNoGlobalHorizontalOverflow(page);

  await page.getByRole("button", { name: "Nueva solicitud" }).click();
  const dialog = page.getByRole("dialog", { name: "Nueva solicitud" });
  await expect(dialog).toBeVisible();
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(736);
  await page.keyboard.press("Escape");

  await openModule(page, "Tareas");
  const kanban = page.locator(".kanban-columns").first();
  await expect(kanban).toBeVisible();
  const overflow = await kanban.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeGreaterThanOrEqual(overflow.clientWidth);
  await expectNoGlobalHorizontalOverflow(page);

  await openModule(page, "Analítica");
  const filterWidths = await page.locator(".analytics-toolbar label").evaluateAll(
    (labels) => labels.map((label) => label.getBoundingClientRect().width),
  );
  expect(filterWidths.every((width) => width <= 288)).toBe(true);
});
