/**
 * Gera ícones PWA e imagens Apple (splash) a partir de SVG → PNG (sharp).
 * Executar: node scripts/generate-pwa-assets.mjs
 */
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");
const iconsDir = join(publicDir, "icons");
const splashDir = join(publicDir, "splash");

mkdirSync(iconsDir, { recursive: true });
mkdirSync(splashDir, { recursive: true });

function iconSvg(size) {
  const r = Math.round(size * 0.22);
  const cx = size / 2;
  const cr = size * 0.28;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#09090b" rx="${r}"/>
  <circle cx="${cx}" cy="${cx}" r="${cr}" fill="#10b981"/>
</svg>`;
}

function splashSvg(w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#09090b"/>
  <circle cx="${w / 2}" cy="${h * 0.42}" r="${Math.min(w, h) * 0.12}" fill="#10b981"/>
  <text x="50%" y="${h * 0.58}" text-anchor="middle" fill="#fafafa" font-family="system-ui,sans-serif" font-size="${Math.round(
    w * 0.055
  )}" font-weight="600">GliErica</text>
</svg>`;
}

async function writePng(svg, outPath, width, height) {
  await sharp(Buffer.from(svg)).resize(width, height).png().toFile(outPath);
}

const base512 = iconSvg(512);
await writePng(base512, join(iconsDir, "icon-512.png"), 512, 512);
await writePng(base512, join(iconsDir, "icon-192.png"), 192, 192);
await writePng(base512, join(iconsDir, "apple-touch-icon.png"), 180, 180);
await writePng(base512, join(iconsDir, "maskable-512.png"), 512, 512);

// Splash screens comuns (retrato)
const splashes = [
  { name: "iphone-14-pro-max", w: 1290, h: 2796 },
  { name: "iphone-14-pro", w: 1179, h: 2556 },
  { name: "iphone-se", w: 750, h: 1334 },
];

for (const { name, w, h } of splashes) {
  await writePng(splashSvg(w, h), join(splashDir, `${name}.png`), w, h);
}

console.log("PWA assets written to public/icons and public/splash");
