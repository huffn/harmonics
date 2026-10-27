// Pure mask helpers for turning the colored map into per-country glow masks.
// Images are raw RGBA Uint8Arrays; masks are Uint8Arrays of 0/1 per pixel.

export function classify(rgba: Uint8Array | Uint8ClampedArray, w: number, h: number, refColors: number[][], tol: number) {
  const mask = new Uint8Array(w * h);
  const tol2 = tol * tol;
  for (let i = 0; i < w * h; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    for (const [rr, gg, bb] of refColors) {
      const d = (r - rr) ** 2 + (g - gg) ** 2 + (b - bb) ** 2;
      if (d <= tol2) {
        mask[i] = 1;
        break;
      }
    }
  }
  return mask;
}

// Any 0-pixel not reachable from the image border (4-connected) becomes 1.
export function fillHoles(mask: Uint8Array, w: number, h: number) {
  const outside = new Uint8Array(w * h);
  const stack: number[] = [];
  const seed = (x: number, y: number) => {
    const i = y * w + x;
    if (!mask[i] && !outside[i]) {
      outside[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x, 0);
    seed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    seed(0, y);
    seed(w - 1, y);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    const y = (i - x) / w;
    if (x > 0) seed(x - 1, y);
    if (x < w - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < h - 1) seed(x, y + 1);
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = outside[i] ? 0 : 1;
  return out;
}

// Separable box blur of the mask, scaled to 0..255, for a soft glow edge.
export function smoothEdge(mask: Uint8Array, w: number, h: number, radius: number) {
  const tmp = new Float32Array(w * h);
  const span = radius * 2 + 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += mask[y * w + Math.min(w - 1, Math.max(0, x + k))];
      tmp[y * w + x] = sum / span;
    }
  }
  const alpha = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += tmp[Math.min(h - 1, Math.max(0, y + k)) * w + x];
      alpha[y * w + x] = Math.round((sum / span) * 255);
    }
  }
  return alpha;
}

// Keeps only the 8-connected parts of the mask that contain one of the seeds.
export function keepComponents(mask: Uint8Array, w: number, h: number, seeds: number[][]) {
  const out = new Uint8Array(w * h);
  const stack: number[] = [];
  for (const [x, y] of seeds) {
    const i = y * w + x;
    if (mask[i] && !out[i]) {
      out[i] = 1;
      stack.push(i);
    }
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    const y = (i - x) / w;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (mask[j] && !out[j]) {
          out[j] = 1;
          stack.push(j);
        }
      }
    }
  }
  return out;
}

// Paints over a rectangle (e.g. a map label) in place by copying the pixels
// `dy` rows above it, which keeps the surrounding texture. Within `feather`
// pixels of the rectangle's edge it blends into the original. Pixels where
// `inside(x, y)` is false are left alone (e.g. the map's rounded frame).
export function patchFromAbove(
  rgba: Uint8Array | Uint8ClampedArray,
  w: number,
  h: number,
  rect: { x0: number; y0: number; x1: number; y1: number },
  dy: number,
  feather: number,
  inside: (x: number, y: number) => boolean = () => true
) {
  for (let y = rect.y0; y < rect.y1; y++) {
    for (let x = rect.x0; x < rect.x1; x++) {
      if (!inside(x, y)) continue;
      const edge = Math.min(x - rect.x0, rect.x1 - 1 - x, y - rect.y0, rect.y1 - 1 - y);
      const t = feather > 0 ? Math.min(1, (edge + 1) / feather) : 1;
      const i = (y * w + x) * 4;
      const src = ((y - dy) * w + x) * 4;
      for (let ch = 0; ch < 3; ch++) rgba[i + ch] = Math.round(rgba[i + ch] * (1 - t) + rgba[src + ch] * t);
    }
  }
}
