/**
 * Gera ícones PWA e imagens Apple (splash) a partir de public/brand/logo.png (sharp).
 * Executar: npm run pwa:assets
 */
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");
const logoPath = join(publicDir, "brand", "logo.png");
const iconsDir = join(publicDir, "icons");
const splashDir = join(publicDir, "splash");

if (!existsSync(logoPath)) {
  console.error(
    "Falta public/brand/logo.png — coloca aqui o ficheiro PNG do logo."
  );
  process.exit(1);
}

mkdirSync(iconsDir, { recursive: true });
mkdirSync(splashDir, { recursive: true });

/** Alinhado a --canvas em globals.css */
const ICON_BG = { r: 238, g: 242, b: 247, alpha: 1 };

/**
 * @param {number} size
 * @param {string} outPath
 * @param {number} paddingRatio — fração do lado útil para o logo (maskable usa menos para zona segura)
 */
async function iconSquare(size, outPath, paddingRatio = 0.88) {
  const inner = Math.max(1, Math.round(size * paddingRatio));
  const buf = await sharp(logoPath)
    .resize(inner, inner, { fit: "inside" })
    .toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: ICON_BG,
    },
  })
    .composite([{ input: buf, gravity: "center" }])
    .png()
    .toFile(outPath);
}

/**
 * @param {string} name
 * @param {number} w
 * @param {number} h
 */
async function splashScreen(name, w, h) {
  const target = Math.round(Math.min(w, h) * 0.36);
  const buf = await sharp(logoPath)
    .resize(target, target, { fit: "inside" })
    .toBuffer();
  const meta = await sharp(buf).metadata();
  const lw = meta.width ?? target;
  const lh = meta.height ?? target;
  const left = Math.round((w - lw) / 2);
  const top = Math.round(h * 0.38 - lh / 2);
  await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: ICON_BG,
    },
  })
    .composite([{ input: buf, left, top }])
    .png()
    .toFile(join(splashDir, `${name}.png`));
}

await iconSquare(512, join(iconsDir, "icon-512.png"), 0.88);
await iconSquare(192, join(iconsDir, "icon-192.png"), 0.88);
await iconSquare(180, join(iconsDir, "apple-touch-icon.png"), 0.88);
await iconSquare(512, join(iconsDir, "maskable-512.png"), 0.72);

const splashes = [
  { name: "iphone-14-pro-max", w: 1290, h: 2796 },
  { name: "iphone-14-pro", w: 1179, h: 2556 },
  { name: "iphone-se", w: 750, h: 1334 },
];

for (const { name, w, h } of splashes) {
  await splashScreen(name, w, h);
}

console.log("PWA assets gerados a partir de public/brand/logo.png");
