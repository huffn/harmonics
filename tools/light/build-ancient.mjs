// Turns the GM's ancient world map into the table's assets:
//   assets/map-ancient.jpg   the map the table is drawn on (no marking)
//   assets/mark.png          only the stone-circle marking, transparent elsewhere;
//                            it fades in over the map when the puzzle is solved
// The marking is found by comparing the marked copy of the map with the plain one.
// Usage: node tools/light/build-ancient.mjs [plain.jpg] [marked.jpg]
//   (defaults: tools/light/source/ancient-map.jpg and ancient-map-marked.jpg, git-ignored)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SOURCE = path.resolve(import.meta.dirname, 'source');
const ASSETS = path.resolve(import.meta.dirname, '..', '..', 'static', 'light', 'assets');
// The marking's box on the 1674×971 map.
const BOX = { left: 764, top: 554, width: 88, height: 81 };
// Max channel difference (0..1) below which a pixel is parchment, and above which it is ink.
const CLEAR = 0.04;
const SOLID = 0.25;

async function rgb(file, box) {
  let img = sharp(file).removeAlpha();
  if (box) img = img.extract(box);
  return img.raw().toBuffer({ resolveWithObject: true });
}

async function main() {
  const plain = process.argv[2] || path.join(SOURCE, 'ancient-map.jpg');
  const marked = process.argv[3] || path.join(SOURCE, 'ancient-map-marked.jpg');
  for (const f of [plain, marked]) {
    if (!fs.existsSync(f)) {
      console.error(`Source map not found: ${f}`);
      process.exit(1);
    }
  }

  const meta = await sharp(plain).metadata();
  await sharp(plain).jpeg({ quality: 85 }).toFile(path.join(ASSETS, 'map-ancient.jpg'));

  const { data: base } = await rgb(plain, BOX);
  const { data: ink } = await rgb(marked, BOX);
  const n = BOX.width * BOX.height;
  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    let diff = 0;
    for (let k = 0; k < 3; k++) diff = Math.max(diff, Math.abs(ink[i * 3 + k] - base[i * 3 + k]) / 255);
    const a = Math.min(1, Math.max(0, (diff - CLEAR) / (SOLID - CLEAR)));
    out.set([ink[i * 3], ink[i * 3 + 1], ink[i * 3 + 2], Math.round(a * 255)], i * 4);
  }
  await sharp(out, { raw: { width: BOX.width, height: BOX.height, channels: 4 } })
    .png()
    .toFile(path.join(ASSETS, 'mark.png'));

  const u = (v, total, cells) => ((v / total) * cells).toFixed(2);
  console.log(`map ${meta.width}×${meta.height}`);
  console.log(
    `mark box in board units: x ${u(BOX.left, meta.width, 25)}, y ${u(BOX.top, meta.height, 15)},` +
      ` width ${u(BOX.width, meta.width, 25)}, height ${u(BOX.height, meta.height, 15)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
