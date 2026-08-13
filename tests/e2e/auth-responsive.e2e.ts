import { expect, test } from "@playwright/test";

const accessViewports = [
  { name: "mobile-320", width: 320, height: 568 },
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1024", width: 1024, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "reference-1487", width: 1487, height: 1058 },
] as const;

const screenshotPaths: Record<(typeof accessViewports)[number]["name"], string> = {
  "mobile-320": "artifacts/v1.8.1-auth-option-1-mobile.png",
  "mobile-360": "artifacts/v1.8.1-auth-option-1-mobile-360.png",
  "mobile-390": "artifacts/v1.8.1-auth-option-1-mobile-390.png",
  "tablet-768": "artifacts/v1.8.1-auth-option-1-tablet-768.png",
  "desktop-1024": "artifacts/v1.8.1-auth-option-1-desktop-1024.png",
  "desktop-1440": "artifacts/v1.8.1-auth-option-1-desktop.png",
  "reference-1487": "artifacts/v1.8.1-auth-option-1-fidelity.png",
};

test("access stays complete and collision-free on web and mobile", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");

  for (const viewport of accessViewports) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Todo el trabajo, en un solo lugar" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Entra en tu espacio" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Continuar con Google" })).toBeVisible();
    await expect(page.locator('a[href="/explorar"]')).toBeVisible();
    await expect(page.getByText("© 2026 Antonio Jesús Delgado Briones. Todos los derechos reservados.")).toBeVisible();

    const layout = await page.evaluate(() => {
      const selectors = [
        ".oauth-header-v181",
        ".oauth-showcase-v181",
        ".oauth-card-v181",
        ".oauth-page-v181 > .legal-footer",
      ];
      const boxes = selectors.map((selector) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        const rect = element.getBoundingClientRect();
        return { selector, top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left };
      });
      const visibleBoxes = boxes.filter(({ bottom, top }) => bottom > top);
      const collisions = visibleBoxes.flatMap((box, index) =>
        visibleBoxes.slice(index + 1).flatMap((candidate) => {
          const width = Math.min(box.right, candidate.right) - Math.max(box.left, candidate.left);
          const height = Math.min(box.bottom, candidate.bottom) - Math.max(box.top, candidate.top);
          return width > 1 && height > 1
            ? [`${box.selector} overlaps ${candidate.selector} by ${Math.round(width)}x${Math.round(height)}`]
            : [];
        }),
      );
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        clientHeight: document.documentElement.clientHeight,
        scrollHeight: document.documentElement.scrollHeight,
        boxes,
        collisions,
      };
    });

    expect(layout.scrollWidth, JSON.stringify(layout)).toBeLessThanOrEqual(layout.clientWidth);
    expect(layout.scrollHeight, JSON.stringify(layout)).toBeLessThanOrEqual(layout.clientHeight + 1);
    expect(
      layout.boxes.every(({ left, right, top, bottom }) =>
        left >= -1 && right <= viewport.width + 1 && top >= -1 && bottom <= viewport.height + 1,
      ),
      JSON.stringify(layout),
    ).toBe(true);
    expect(layout.collisions, JSON.stringify(layout)).toEqual([]);

    await page.screenshot({ path: screenshotPaths[viewport.name] });
  }
});
