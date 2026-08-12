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
  "Operaciones",
] as const;

async function enterGuestDemo(page: Page) {
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
}

async function openGuestDemo(page: Page) {
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });
  await enterGuestDemo(page);
  const analyticsDialog = page.getByRole("dialog", { name: "Analítica opcional" });
  if (await analyticsDialog.isVisible()) {
    await analyticsDialog.getByRole("button", { name: "Rechazar" }).click();
  }
}

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

async function expectPanelsInsideViewport(page: Page) {
  const { panels, viewportWidth } = await page.evaluate(() => ({
    viewportWidth: innerWidth,
    panels: [
      ...document.querySelectorAll<HTMLElement>(
        ".workspace, .section-block, .kanban-board, .kanban-columns, .data-table-wrap, .dialog-content",
      ),
    ]
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          className: element.className,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        };
      }),
  }));
  expect(
    panels.every(
      ({ left, right }) => left >= -1 && right <= viewportWidth + 1,
    ),
    JSON.stringify(panels),
  ).toBe(true);
}

async function openModule(
  page: Page,
  moduleName: (typeof modules)[number],
) {
  const mobileNavigation = page.getByRole("navigation", {
    name: "Navegación móvil",
  });
  if (await mobileNavigation.isVisible()) {
    const directLabel =
      moduleName === "Personal" ? "Personas" : moduleName === "Analítica" ? "Analítica" : null;
    if (directLabel) {
      await mobileNavigation.getByRole("button", { name: directLabel, exact: true }).click();
    } else {
      await mobileNavigation.getByRole("button", { name: "Más", exact: true }).click();
      await page
        .getByRole("dialog", { name: "Todos los módulos" })
        .getByRole("button", { name: moduleName, exact: true })
        .click();
    }
  } else if (["Personal", "Analítica", "Configuración"].includes(moduleName)) {
    const directLabel = moduleName === "Personal" ? "Personas" : moduleName;
    await page.getByRole("button", { name: directLabel, exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Trabajo", exact: true }).click();
    await page.getByRole("menuitem", { name: moduleName, exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: moduleName, level: 1 })).toBeVisible();
}

test("light and dark resolve before content at every release width", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  test.setTimeout(180_000);

  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await openGuestDemo(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    "light",
  );

  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({
      colorScheme: theme,
      reducedMotion: "reduce",
    });
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await openGuestDemo(page);
      await expect
        .poll(() =>
          page.evaluate(() =>
            window.sessionStorage.getItem("management-platform-demo:v1"),
          ),
        )
        .not.toBeNull();
      await page.evaluate((preference) => {
        const key = "management-platform-demo:v1";
        const raw = window.sessionStorage.getItem(key);
        if (!raw) throw new Error("Guest state was not initialized");
        const state = JSON.parse(raw) as {
          preferences: { theme: "light" | "dark" };
        };
        state.preferences.theme = preference;
        window.sessionStorage.setItem(key, JSON.stringify(state));
        window.sessionStorage.setItem("management-platform-theme", preference);
      }, theme);
      await page.reload({ waitUntil: "domcontentloaded" });
      await enterGuestDemo(page);

      const experience = await page.evaluate(() => ({
        preference: document.documentElement.dataset.themePreference,
        resolved: document.documentElement.dataset.theme,
        colorScheme: document.documentElement.style.colorScheme,
        reducedMotion: getComputedStyle(
          document.querySelector(".app-frame")!,
        ).animationDuration,
      }));
      const expected = theme;
      expect(experience.preference).toBe(theme);
      expect(experience.resolved).toBe(expected);
      expect(experience.colorScheme).toBe(expected);
      expect(Number.parseFloat(experience.reducedMotion)).toBeLessThanOrEqual(
        0.00001,
      );
      await expectNoGlobalHorizontalOverflow(page);

      if (viewport.width === 320 && expected === "dark") {
        await openModule(page, "Configuración");
        const control = page.locator("input, select, textarea").first();
        await expect(control).toBeVisible();
        const colors = await control.evaluate((element) => {
          const style = getComputedStyle(element);
          return { background: style.backgroundColor, foreground: style.color };
        });
        expect(colors.background).not.toBe("rgb(255, 255, 255)");
        expect(colors.foreground).not.toBe(colors.background);
        await expectPanelsInsideViewport(page);
      }
    }
  }
});

test("access and every module avoid global horizontal overflow at release sizes", async (
  { page },
  testInfo,
) => {
  test.skip(testInfo.project.name !== "chromium");
  test.setTimeout(180_000);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Todo el trabajo, en un solo lugar", level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Explorar sin iniciar sesión" })).toBeVisible();
    await expectNoGlobalHorizontalOverflow(page);

    await openGuestDemo(page);
    await expectNoGlobalHorizontalOverflow(page);

    for (const moduleName of modules) {
      await openModule(page, moduleName);
      await expectNoGlobalHorizontalOverflow(page);
    }
  }
});

test("the access screen keeps all primary actions inside compact viewports", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "Continuar con Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Microsoft/ }).or(page.getByRole("link", { name: /Microsoft/ }))).toBeVisible();
    await expect(page.getByRole("link", { name: "Explorar sin iniciar sesión" })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewportHeight: innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
      cardBottom: Math.round(document.querySelector(".oauth-card")?.getBoundingClientRect().bottom ?? 0),
    }));
    expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.viewportHeight + 1);
    expect(dimensions.cardBottom).toBeLessThanOrEqual(dimensions.viewportHeight + 1);
    await expectNoGlobalHorizontalOverflow(page);
  }
});

test("desktop header keeps its width while a scrolled detail dialog locks the background", async (
  { page },
  testInfo,
) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.setViewportSize({ width: 1440, height: 900 });
  await openGuestDemo(page);
  await openModule(page, "Vacaciones");

  const header = page.locator(".v18-header-inner");
  const before = await header.boundingBox();
  await page.evaluate(() => window.scrollTo({ top: 600 }));
  await page.getByRole("button", { name: /Ver detalle/ }).first().click();
  await expect(page.locator('[role="dialog"]:visible')).toBeVisible();
  const during = await header.boundingBox();

  expect(during?.x).toBe(before?.x);
  expect(during?.width).toBe(before?.width);
  expect(during?.height).toBe(before?.height);
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await expect(header).toBeVisible();
});

test("mobile filters, tables, Kanban and dialogs stay inside their panels", async (
  { page },
  testInfo,
) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.setViewportSize({ width: 320, height: 768 });
  await openGuestDemo(page);

  await openModule(page, "Vacaciones");
  const tableContainer = page.locator(".data-table-wrap").first();
  await expect(tableContainer).toBeVisible();
  await expect(tableContainer.locator("thead")).toBeHidden();
  const tableGeometry = await tableContainer.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(tableGeometry.scrollWidth).toBeLessThanOrEqual(
    tableGeometry.clientWidth,
  );
  await expectPanelsInsideViewport(page);
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
    scrollLeft: element.scrollLeft,
    visibleColumns: [...element.querySelectorAll<HTMLElement>(
      ".kanban-column-slot",
    )].filter((column) => column.getClientRects().length > 0).length,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollLeft).toBeLessThanOrEqual(2);
  expect(overflow.visibleColumns).toBe(1);
  await expectPanelsInsideViewport(page);
  await expectNoGlobalHorizontalOverflow(page);

  await page.getByLabel("Columna del tablero").selectOption("blocked");
  await expect(
    kanban.locator('.kanban-column-slot[data-mobile-active="true"]'),
  ).toHaveAttribute("data-mobile-active", "true");
  await expect(
    kanban.locator('.kanban-column-slot[data-mobile-active="true"]'),
  ).toContainText("Bloqueada");

  await page.getByLabel("Estado").selectOption("in_progress");
  const singleColumn = await kanban.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    columns: element.querySelectorAll(".kanban-column-slot").length,
  }));
  expect(singleColumn.columns).toBe(1);
  expect(singleColumn.scrollWidth).toBeLessThanOrEqual(singleColumn.clientWidth);

  await openModule(page, "Analítica");
  const filterWidths = await page.locator(".analytics-toolbar label").evaluateAll(
    (labels) => labels.map((label) => label.getBoundingClientRect().width),
  );
  expect(filterWidths.every((width) => width <= 288)).toBe(true);

  await openModule(page, "Novedades");
  await expect(page.getByText("Versión 1.3.1", { exact: true })).toBeVisible();
});
