import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.env.PRODUCT_CAPTURE_ORIGIN ?? "http://127.0.0.1:3210";
const outputDirectory = ".artifacts/release-v1.2.2";
const modules = [
  ["Vacaciones", "vacaciones"],
  ["Analítica", "analitica"],
  ["Proyectos", "proyectos"],
  ["Tareas", "tareas"],
  ["Personal", "personal"],
  ["Incidencias", "incidencias"],
  ["Tesorería", "tesoreria"],
  ["Nóminas", "nominas"],
  ["Novedades", "novedades"],
  ["Configuración", "configuracion"],
];

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: "light",
      reducedMotion: "reduce",
    });

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.screenshot({
      path: `${outputDirectory}/acceso-${viewport.name}.png`,
      animations: "disabled",
    });

    await page.goto(`${baseUrl}/demo/embed`, {
      waitUntil: "domcontentloaded",
    });
    await page.locator("[data-demo-ready='true']").waitFor();
    await page.locator("h1", { hasText: "Inicio" }).waitFor();
    await page.screenshot({
      path: `${outputDirectory}/inicio-${viewport.name}.png`,
      animations: "disabled",
    });

    for (const [label, slug] of modules) {
      if (viewport.name === "mobile") {
        await page
          .getByRole("button", { name: "Abrir menú de módulos" })
          .click();
      }
      await page
        .getByRole("button", { name: label, exact: true })
        .first()
        .click();
      await page.locator("h1", { hasText: label }).waitFor();
      await page.waitForTimeout(500);
      await page.locator(".app-main").evaluate((element) => {
        element.scrollTop = 0;
      });
      if (viewport.name === "desktop") {
        await page.locator(".sidebar").evaluate((element) => {
          element.scrollTop = 0;
        });
      }
      await page.screenshot({
        path: `${outputDirectory}/${slug}-${viewport.name}.png`,
        animations: "disabled",
      });

      if (slug === "vacaciones") {
        await page.getByRole("button", { name: /Ver detalle/ }).first().click();
        await page.locator('[role="dialog"]:visible').waitFor();
        await page.screenshot({
          path: `${outputDirectory}/vacaciones-dialogo-${viewport.name}.png`,
          animations: "disabled",
        });
        await page.keyboard.press("Escape");
      }

      if (slug === "analitica") {
        await page
          .getByRole("combobox", { name: "Periodo", exact: true })
          .selectOption("30d");
        await page.getByLabel("Proyecto").selectOption({ index: 1 });
        await page.waitForTimeout(250);
        await page.screenshot({
          path: `${outputDirectory}/analitica-filtrada-${viewport.name}.png`,
          animations: "disabled",
        });
      }

      if (slug === "personal") {
        await page.locator(".people-card").first().click();
        await page.locator('[role="dialog"]:visible').waitFor();
        await page.screenshot({
          path: `${outputDirectory}/personal-dialogo-${viewport.name}.png`,
          animations: "disabled",
        });
        await page.keyboard.press("Escape");

        await page.getByRole("button", { name: "Organigrama" }).click();
        await page.waitForTimeout(250);
        await page.screenshot({
          path: `${outputDirectory}/organigrama-${viewport.name}.png`,
          animations: "disabled",
        });
      }

      if (slug === "nominas") {
        await page.locator(".treasury-row").first().click();
        await page.locator('[role="dialog"]:visible').waitFor();
        await page.screenshot({
          path: `${outputDirectory}/nominas-dialogo-${viewport.name}.png`,
          animations: "disabled",
        });
        await page.keyboard.press("Escape");
      }

      if (slug === "tareas") {
        if (viewport.name === "mobile") {
          await page.getByRole("button", { name: "Lista", exact: true }).click();
        }
        await page
          .getByRole("button", { name: /Validar el flujo con el equipo/ })
          .first()
          .click();
        await page.locator('[role="dialog"]:visible').waitFor();
        await page.screenshot({
          path: `${outputDirectory}/tareas-dialogo-${viewport.name}.png`,
          animations: "disabled",
        });
        await page.keyboard.press("Escape");
      }
    }

    await page.close();
  }
  console.log(`Captured release visuals in ${outputDirectory}`);
} finally {
  await browser.close();
}
