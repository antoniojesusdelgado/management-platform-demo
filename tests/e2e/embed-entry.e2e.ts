import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("starts with a clear choice between guest and Google access", async ({ page }) => {
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });

  await expect(page.locator('[data-embed-entry="true"]')).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Explora la Plataforma de gestión" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Explorar demo sin registro" })).toBeVisible();
  const googleAccess = page.getByRole("link", { name: /Continuar con Google/ });
  await expect(googleAccess).toHaveAttribute("target", "_blank");
  await expect(googleAccess).toHaveAttribute("rel", /noopener/);
});

test("enters the guest demo only after an explicit action", async ({ page }) => {
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });

  await expect(page.locator('[data-demo-ready="true"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Explorar demo sin registro" }).click();
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
});

test("entry screen has no detectable WCAG A or AA violations", async ({ page }) => {
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-embed-entry="true"]')).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
