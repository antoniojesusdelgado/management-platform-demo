import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("opens the guest workspace directly", async ({ page }) => {
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });

  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /^(Buenos días|Buenas tardes|Buenas noches), Usuario invitado$/,
    }),
  ).toBeVisible();
});

test("does not render the removed intermediate entry screen", async ({ page }) => {
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });

  await expect(page.locator('[data-embed-entry="true"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Explorar demo sin registro" })).toHaveCount(0);
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
});

test("direct guest entry has no detectable WCAG A or AA violations", async ({ page }) => {
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
