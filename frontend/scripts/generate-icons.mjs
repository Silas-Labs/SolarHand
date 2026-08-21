// Generate PWA raster icons from the master SVG (public/favicon.svg).
// Run with: npm run icons   (requires the `sharp` dev dependency)
import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const OUT = here("../public/icons");
const THEME = "#10152e";

async function main() {
  await mkdir(OUT, { recursive: true });
  const svg = await readFile(here("../public/favicon.svg"));

  // Standard "any" icons — rasterize the rounded tile directly.
  for (const size of [192, 512]) {
    await sharp(svg, { density: 384 })
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(`${OUT}/pwa-${size}.png`);
  }

  // Apple touch icon (opaque background, 180x180).
  await sharp(svg, { density: 384 })
    .resize(180, 180, { fit: "contain", background: THEME })
    .flatten({ background: THEME })
    .png()
    .toFile(`${OUT}/apple-touch-icon.png`);

  // Maskable icon: full-bleed theme background with the mark inset into the
  // safe zone (~78%) so adaptive/circular masks never clip the cells.
  const inner = Math.round(512 * 0.78);
  const mark = await sharp(svg, { density: 512 })
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: THEME },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(`${OUT}/maskable-512.png`);

  console.log("icons written to", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
