import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const baseUrl = process.env.PRODUCT_CAPTURE_ORIGIN ?? "http://127.0.0.1:3212";
const outputDirectory = "artifacts/v1.8.2";
const viewports = [
  ["mobile-320", 320, 568],
  ["mobile-360", 360, 800],
  ["mobile-390", 390, 844],
  ["tablet-768", 768, 1024],
  ["desktop-1024", 1024, 768],
  ["desktop-1440", 1440, 900],
];

await mkdir(outputDirectory, { recursive: true });
const server = process.env.PRODUCT_CAPTURE_ORIGIN
  ? null
  : spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3212"], { stdio: "pipe" });

if (server) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${baseUrl}/login`)).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const theme of ["light", "dark"]) {
    for (const [name, width, height] of viewports) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
      await page.addInitScript((selectedTheme) => sessionStorage.setItem("management-platform-theme", selectedTheme), theme);
      await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
      }));
      if (dimensions.scrollWidth > dimensions.clientWidth || dimensions.scrollHeight > dimensions.clientHeight) {
        throw new Error(`Overflow at ${name}/${theme}: ${JSON.stringify(dimensions)}`);
      }
      await page.screenshot({ path: `${outputDirectory}/acceso-${theme}-${name}.png`, animations: "disabled" });
      await page.close();
    }
  }
} finally {
  await browser.close();
  server?.kill();
}
