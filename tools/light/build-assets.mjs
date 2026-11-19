// Turns the GM's colored world map into each country's glow mask (the table
// itself is drawn on the ancient map; see build-ancient.mjs):
//   assets/mask-<name>.png    each country's shape (greyscale alpha); the page
//                             colors its glow through this mask
// Usage: node tools/light/build-assets.mjs [path/to/source-map.png]  (default: tools/light/source/fabula-map.png, git-ignored)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

import { classify, fillHoles, smoothEdge, keepComponents } from './masks.ts';

const DEFAULT_SOURCE = path.resolve(import.meta.dirname, 'source', 'fabula-map.png');
const ASSETS = path.resolve(import.meta.dirname, '..', '..', 'static', 'light', 'assets');
const WIDTH = 4000;
const TOL = 28;
const EDGE_RADIUS = 6;

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
  if (!fs.existsSync(source)) {
    console.error(`Source map not found: ${source}\nPut it at tools/light/source/fabula-map.png or pass a path.`);
    process.exit(1);
  }

  // The ancient map is this map at the same scale with the bottom trimmed off,
  // so crop to its shape: the board stretches both to the same box.
  const ancient = await sharp(path.join(ASSETS, 'map-ancient.jpg')).metadata();
  const height = Math.round((WIDTH * ancient.height) / ancient.width);
  const resized = sharp(source, { limitInputPixels: false })
    .resize({ width: WIDTH })
    .extract({ left: 0, top: 0, width: WIDTH, height });
  const { data, info } = await resized.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  console.log(`working size ${w}×${h}`);

  const scale = w / 2000;
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
