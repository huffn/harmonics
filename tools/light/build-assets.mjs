// Turns the GM's colored world map into the table's assets:
//   assets/map-grey.jpg       the greyscale display map
//   assets/mask-<name>.png    each country's shape (greyscale alpha); the page
//                             colors its glow through this mask
// Usage: node tools/light/build-assets.mjs [path/to/source-map.png]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

import { classify, fillHoles, smoothEdge, keepComponents, patchFromAbove } from './masks.ts';

const DEFAULT_SOURCE = '/Users/huffn/Downloads/Fabula 2026-03-31-23-37.png';
const ASSETS = path.resolve(import.meta.dirname, '..', '..', 'static', 'light', 'assets');
const SOURCE_COPY = path.join(ASSETS, 'source', 'fabula-map.png');
const WIDTH = 4000;
const TOL = 28;
const EDGE_RADIUS = 6;

// The map's distance scale bar (bottom right), painted out with the sea
// texture directly above it, but only inside the frame's rounded corner.
// 2000×1192 coordinates.
const SCALE_BAR = { x0: 1690, y0: 1131, x1: 1992, y1: 1179 };
const SCALE_BAR_LIFT = 56;
const FRAME_CORNER = { cx: 1950, cy: 1132.5, r: 45 }; // the rounded corner's arc, inset slightly

// Seeds are in 2000×1192 coordinates (see the plan); scaled to WIDTH below.
const COUNTRIES = {
  dhruv: { seeds: [[150, 300]] },
  galatea: { seeds: [[720, 520]] },
  samitra: { seeds: [[1500, 380], [100, 600], [1965, 560]] },
  volund: { seeds: [[1800, 120], [300, 150]] },
  radiant: { seeds: [[650, 90]] },
};

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function sampleColor(rgba, w, x, y) {
  const rs = [];
  const gs = [];
  const bs = [];
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const i = ((y + dy) * w + (x + dx)) * 4;
      rs.push(rgba[i]);
      gs.push(rgba[i + 1]);
      bs.push(rgba[i + 2]);
    }
  }
  return [median(rs), median(gs), median(bs)];
}

async function main() {
  const source = process.argv[2] || DEFAULT_SOURCE;
  fs.mkdirSync(path.dirname(SOURCE_COPY), { recursive: true });
  if (path.resolve(source) !== SOURCE_COPY) fs.copyFileSync(source, SOURCE_COPY);

  const resized = sharp(SOURCE_COPY, { limitInputPixels: false }).resize({ width: WIDTH });
  const { data, info } = await resized.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  console.log(`working size ${w}×${h}`);

  const scale = w / 2000;
  const sc = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round(v * scale)]));
  const display = Buffer.from(data);
  const corner = { cx: FRAME_CORNER.cx * scale, cy: FRAME_CORNER.cy * scale, r: FRAME_CORNER.r * scale };
  const insideFrame = (x, y) =>
    x < corner.cx || y < corner.cy || (x - corner.cx) ** 2 + (y - corner.cy) ** 2 < corner.r ** 2;
  patchFromAbove(display, w, h, sc(SCALE_BAR), Math.round(SCALE_BAR_LIFT * scale), Math.round(5 * scale), insideFrame);
  await sharp(display, { raw: { width: w, height: h, channels: 4 } })
    .greyscale()
    .jpeg({ quality: 82 })
    .toFile(path.join(ASSETS, 'map-grey.jpg'));

  for (const [name, { seeds }] of Object.entries(COUNTRIES)) {
    const pts = seeds.map(([x, y]) => [Math.round(x * scale), Math.round(y * scale)]);
    const refs = pts.map(([x, y]) => sampleColor(data, w, x, y));
    const mask = fillHoles(keepComponents(classify(data, w, h, refs, TOL), w, h, pts), w, h);
    const alpha = smoothEdge(mask, w, h, EDGE_RADIUS);

    let covered = 0;
    for (const v of mask) covered += v;
    console.log(`${name}: refs ${JSON.stringify(refs)} coverage ${((covered / (w * h)) * 100).toFixed(1)}%`);

    await sharp(Buffer.from(alpha), { raw: { width: w, height: h, channels: 1 } })
      .png()
      .toFile(path.join(ASSETS, `mask-${name}.png`));

  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
