#!/usr/bin/env node
/**
 * One-shot build of the site-wide OpenGraph image.
 *
 * Composites the chosen Wayka color logo (from `docs/svg/`) onto a
 * 1200x630 cream canvas and writes `frontend/src/app/opengraph-image.png`.
 *
 * This script is intentionally NOT in CI — it runs once per palette
 * or logo change. Re-run it manually after editing the brand assets
 * or picking a different variant.
 *
 * Usage:
 *   node scripts/build_og_image.mjs
 *
 * Dependencies:
 *   sharp (vendored under frontend/node_modules/.pnpm via Next).
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require(
  "../frontend/node_modules/.pnpm/sharp@0.34.5/node_modules/sharp",
);

const REPO_ROOT = new URL("..", import.meta.url).pathname;
const SVG_PATH = join(
  REPO_ROOT,
  "docs",
  "svg",
  "variaciones de color en png",
  "wayka logo variaciones color-01.min.svg",
);
const OUT_PATH = join(REPO_ROOT, "frontend", "src", "app", "opengraph-image.png");

const WIDTH = 1200;
const HEIGHT = 630;
const CREAM = { r: 0xf3, g: 0xeb, b: 0xdf, alpha: 1 };

const LOGO_TARGET = 480; // 480x480 logo on a 1200x630 canvas

async function main() {
  const svg = await readFile(SVG_PATH);

  // Rasterize the SVG at the target logo size with a transparent bg.
  const logo = await sharp(svg)
    .resize(LOGO_TARGET, LOGO_TARGET, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: CREAM,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(OUT_PATH);

  console.log(`Wrote ${OUT_PATH} (${WIDTH}x${HEIGHT})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
