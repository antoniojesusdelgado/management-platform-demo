import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("opens the guest workspace directly", async ({ page }) => {
  await page.goto("/explorar", { waitUntil: "domcontentloaded" });

  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /^(Buenos días|Buenas tardes|Buenas noches), Usuario invitado$/,
    }),
  ).toBeVisible();
});

test("guest can close the local session and return to access", async ({ page }) => {
  await page.goto("/explorar", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Abrir menú de usuario" }).click();
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Entra en tu espacio" })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("management-platform:v1"))).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem("management-platform-demo:v1"))).toBeNull();
});

test("starting from access creates a clean isolated guest workspace", async ({ page }) => {
  await page.goto("/explorar", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
  await page.evaluate(() => {
    const key = "management-platform:v1";
    const raw = window.sessionStorage.getItem(key);
    if (!raw) throw new Error("Guest workspace state was not initialized");
    const state = JSON.parse(raw) as { organizationName: string };
    state.organizationName = "Espacio compartido no deseado";
    window.sessionStorage.setItem(key, JSON.stringify(state));
  });

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Explorar la plataforma" }).click();
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();

  const organizationName = await page.evaluate(() => {
    const raw = window.sessionStorage.getItem("management-platform:v1");
    return raw ? (JSON.parse(raw) as { organizationName: string }).organizationName : null;
  });
  expect(organizationName).not.toBe("Espacio compartido no deseado");
});

test("redirects the legacy guest URL permanently", async ({ request }) => {
  const response = await request.get("/demo/embed", { maxRedirects: 0 });

  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("/explorar");
});

test("does not render the removed intermediate entry screen", async ({ page }) => {
  await page.goto("/explorar", { waitUntil: "domcontentloaded" });

  await expect(page.locator('[data-embed-entry="true"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Explorar demo sin registro" })).toHaveCount(0);
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
});

test("direct guest entry has no detectable WCAG A or AA violations", async ({ page }) => {
  await page.goto("/explorar", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
