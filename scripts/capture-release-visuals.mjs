import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const externalOrigin = process.env.PRODUCT_CAPTURE_ORIGIN;
const baseUrl = externalOrigin ?? "http://127.0.0.1:3210";
const outputDirectory = ".artifacts/release-v1.5.0";
const themes = ["light", "dark"];
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
const analyticsViews = [
  ["Resumen", "resumen"],
  ["Proyectos y tareas", "trabajo"],
  ["Equipo y disponibilidad", "personas"],
  ["Incidencias y tiempos", "servicio"],
  ["Finanzas e integraciones", "finanzas"],
];

await mkdir(outputDirectory, { recursive: true });

const server = externalOrigin
  ? null
  : spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3210",
      ],
      { stdio: "pipe" },
    );

if (server) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/demo/embed`);
      if (response.ok) break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

async function openModule(page, viewport, label) {
  if (viewport.name === "mobile") {
    await page.getByRole("button", { name: "Abrir menú de módulos" }).click();
  }
  await page
    .getByRole("navigation", { name: "Módulos de la plataforma" })
    .filter({ visible: true })
    .getByRole("button", { name: label, exact: true })
    .click();
  await page.getByRole("heading", { name: label, level: 1 }).waitFor();
}

const browser = await chromium.launch({ headless: true });
try {
  for (const theme of themes) {
    for (const viewport of viewports) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: theme,
        reducedMotion: "reduce",
      });
      await page.addInitScript((preference) => {
        window.sessionStorage.setItem("management-platform-theme", preference);
      }, theme);

      const suffix = `${theme}-${viewport.name}`;
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      await page.screenshot({
        path: `${outputDirectory}/acceso-${suffix}.png`,
        animations: "disabled",
        fullPage: true,
      });

      await page.goto(`${baseUrl}/demo/embed`, {
        waitUntil: "domcontentloaded",
      });
      const guestAccess = page.getByRole("button", {
        name: "Explorar demo sin registro",
      });
      await guestAccess.waitFor();
      await guestAccess.click();
      await page.locator("[data-demo-ready='true']").waitFor();
      await page.waitForFunction(
        () =>
          window.sessionStorage.getItem("management-platform-demo:v1") !== null,
      );
      await page.evaluate((preference) => {
        const key = "management-platform-demo:v1";
        const state = JSON.parse(window.sessionStorage.getItem(key));
        state.preferences.theme = preference;
        window.sessionStorage.setItem(key, JSON.stringify(state));
        window.sessionStorage.setItem("management-platform-theme", preference);
      }, theme);
      await page.reload({ waitUntil: "domcontentloaded" });
      const reloadedGuestAccess = page.getByRole("button", {
        name: "Explorar demo sin registro",
      });
      if (await reloadedGuestAccess.isVisible()) {
        await reloadedGuestAccess.click();
      }

      await page.locator("[data-demo-ready='true']").waitFor();

      await page.screenshot({
        path: `${outputDirectory}/inicio-${suffix}.png`,
        animations: "disabled",
        fullPage: true,
      });

      await openModule(page, viewport, "Vacaciones");
      await page.screenshot({
        path: `${outputDirectory}/vacaciones-${suffix}.png`,
        animations: "disabled",
        fullPage: true,
      });
      await page
        .getByRole("button", { name: /Ver detalle/ })
        .first()
        .click();
      await page.locator('[role="dialog"]:visible').waitFor();
      await page.screenshot({
        path: `${outputDirectory}/vacaciones-dialogo-${suffix}.png`,
        animations: "disabled",
      });
      await page.keyboard.press("Escape");

      for (const label of ["Tareas", "Incidencias"]) {
        await openModule(page, viewport, label);
        await page.screenshot({
          path: `${outputDirectory}/${label.toLowerCase()}-${suffix}.png`,
          animations: "disabled",
          fullPage: true,
        });
      }

      await openModule(page, viewport, "Analítica");
      for (const [label, slug] of analyticsViews) {
        await page.getByRole("button", { name: label, exact: true }).click();
        await page.locator(".app-main").evaluate((element) => {
          element.scrollTop = 0;
        });
        await page.screenshot({
          path: `${outputDirectory}/analitica-${slug}-${suffix}.png`,
          animations: "disabled",
          fullPage: true,
        });
        await page.locator(".app-main").evaluate((element) => {
          element.scrollTop = 640;
        });
        await page.screenshot({
          path: `${outputDirectory}/analitica-${slug}-detalle-${suffix}.png`,
          animations: "disabled",
          fullPage: true,
        });
      }

      await page.close();
    }
  }
  console.log(`Captured release visuals in ${outputDirectory}`);
} finally {
  await browser.close();
  server?.kill();
}
