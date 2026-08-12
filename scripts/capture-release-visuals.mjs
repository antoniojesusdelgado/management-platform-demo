import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const externalOrigin = process.env.PRODUCT_CAPTURE_ORIGIN;
const baseUrl = externalOrigin ?? "http://127.0.0.1:3210";
const outputDirectory = ".artifacts/release-v1.8.2/automated";
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

async function openModule(page, label) {
  const mobileNavigation = page.getByRole("navigation", {
    name: "Navegación móvil",
  });
  if (await mobileNavigation.isVisible()) {
    const directLabel = label === "Personal"
      ? "Personas"
      : ["Inicio", "Analítica"].includes(label) ? label : null;
    if (directLabel) {
      await mobileNavigation.getByRole("button", { name: directLabel, exact: true }).click();
    } else {
      await mobileNavigation.getByRole("button", { name: "Más", exact: true }).click();
      await page
        .getByRole("dialog", { name: "Todos los módulos" })
        .getByRole("button", { name: label, exact: true })
        .click();
    }
  } else if (["Personal", "Analítica", "Configuración", "Inicio"].includes(label)) {
    await page.getByRole("button", {
      name: label === "Personal" ? "Personas" : label,
      exact: true,
    }).click();
  } else {
    await page.getByRole("button", { name: "Trabajo", exact: true }).click();
    await page.getByRole("menuitem", { name: label, exact: true }).click();
  }
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
      await page.locator("[data-demo-ready='true']").waitFor();

      await page.screenshot({
        path: `${outputDirectory}/inicio-${suffix}.png`,
        animations: "disabled",
        fullPage: true,
      });

      await openModule(page, "Vacaciones");
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
        await openModule(page, label);
        await page.screenshot({
          path: `${outputDirectory}/${label.toLowerCase()}-${suffix}.png`,
          animations: "disabled",
          fullPage: true,
        });
      }

      await openModule(page, "Personal");
      await page.screenshot({
        path: `${outputDirectory}/personal-${suffix}.png`,
        animations: "disabled",
        fullPage: true,
      });
      await page.getByRole("button", { name: "Organigrama", exact: true }).click();
      await page.screenshot({
        path: `${outputDirectory}/organigrama-${suffix}.png`,
        animations: "disabled",
        fullPage: true,
      });

      await openModule(page, "Novedades");
      await page.screenshot({
        path: `${outputDirectory}/novedades-${suffix}.png`,
        animations: "disabled",
        fullPage: true,
      });

      await openModule(page, "Analítica");
      for (const [label, slug] of analyticsViews) {
        await page.getByRole("button", { name: label, exact: true }).click();
        await page.evaluate(() => window.scrollTo({ top: 0 }));
        await page.screenshot({
          path: `${outputDirectory}/analitica-${slug}-${suffix}.png`,
          animations: "disabled",
          fullPage: true,
        });
        await page.evaluate(() => window.scrollTo({ top: 640 }));
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
