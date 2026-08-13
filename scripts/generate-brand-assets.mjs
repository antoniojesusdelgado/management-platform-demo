import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicDir = path.join(root, "public");
const source = await readFile(path.join(publicDir, "brand-symbol.svg"));

async function renderPng(name, size) {
  const output = await sharp(source).resize(size, size).png().toBuffer();
  await writeFile(path.join(publicDir, name), output);
  return output;
}

await renderPng("favicon-16.png", 16);
await renderPng("favicon-32.png", 32);
const favicon = await renderPng("favicon-48.png", 48);
await renderPng("apple-touch-icon.png", 180);
await renderPng("icon-192.png", 192);
await renderPng("icon-512.png", 512);

const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
icoHeader.writeUInt8(48, 6);
icoHeader.writeUInt8(48, 7);
icoHeader.writeUInt8(0, 8);
icoHeader.writeUInt8(0, 9);
icoHeader.writeUInt16LE(1, 10);
icoHeader.writeUInt16LE(32, 12);
icoHeader.writeUInt32LE(favicon.length, 14);
icoHeader.writeUInt32LE(22, 18);
await writeFile(path.join(publicDir, "favicon.ico"), Buffer.concat([icoHeader, favicon]));

const symbol = source
  .toString("utf8")
  .replace(/<\?xml[^>]*>/g, "")
  .replace("<svg ", '<svg x="128" y="150" width="144" height="144" ');
const social = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#edf3fa"/>
  <rect x="72" y="64" width="1056" height="502" rx="42" fill="#ffffff" stroke="#d9e4f1"/>
  ${symbol}
  <text x="332" y="255" fill="#071a35" font-family="Arial, sans-serif" font-size="62" font-weight="700">Plataforma de gestión</text>
  <text x="332" y="326" fill="#46607f" font-family="Arial, sans-serif" font-size="31">Todo el trabajo, en un solo lugar</text>
  <rect x="332" y="378" width="250" height="56" rx="18" fill="#2867ed"/>
  <text x="457" y="415" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="24" font-weight="700">plataformagestion.app</text>
</svg>`;
await sharp(Buffer.from(social)).png().toFile(path.join(publicDir, "social-card.png"));
