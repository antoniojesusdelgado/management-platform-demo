import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const targetUrl =
  process.env.PRODUCT_CAPTURE_URL ?? "http://127.0.0.1:3210/demo/embed";
const outputPath = "public/images/product-overview.webp";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  await page.goto(targetUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.locator("[data-demo-ready='true']").waitFor({ timeout: 30_000 });
  await page.locator("h1", { hasText: "Inicio" }).waitFor({ timeout: 30_000 });
  const screenshot = await page.screenshot({
    type: "png",
    animations: "disabled",
  });
  await mkdir(dirname(outputPath), { recursive: true });
  await sharp(screenshot)
    .resize(1600, 900, { fit: "cover", position: "top" })
    .webp({ quality: 84 })
    .toFile(outputPath);
  console.log(`Captured ${outputPath} from ${targetUrl}`);
} finally {
  await browser.close();
}
