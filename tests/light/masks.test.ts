// @ts-nocheck -- ported untyped from the original JS tests; fixtures are partial levels
import { test, expect } from 'vitest';
import { classify, fillHoles, smoothEdge, keepComponents, patchFromAbove } from '../../tools/light/masks';

const W = 20;
const H = 20;

function image(fill) {
  const rgba = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b] = fill(x, y);
      rgba.set([r, g, b, 255], (y * W + x) * 4);
    }
  }
  return rgba;
}

const inSquare = (x, y, x0, y0, size) => x >= x0 && x < x0 + size && y >= y0 && y < y0 + size;

test('classify marks pixels near a reference color only', () => {
  const rgba = image((x, y) => (inSquare(x, y, 5, 5, 10) ? [200, 100, 200] : x < 3 ? [10, 200, 10] : [0, 0, 0]));
  const mask = classify(rgba, W, H, [[205, 98, 196]], 20);
  expect(mask[7 * W + 7]).toBe(1);
  expect(mask[7 * W + 1]).toBe(0);
  expect(mask[0]).toBe(0);
});

function ringMask(openChannel) {
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let on = inSquare(x, y, 5, 5, 10) && !inSquare(x, y, 8, 8, 3);
      if (openChannel && y === 9 && x >= 8) on = false;
      if (on) mask[y * W + x] = 1;
    }
  }
  return mask;
}

test('fillHoles fills an enclosed hole', () => {
  const out = fillHoles(ringMask(false), W, H);
  expect(out[9 * W + 9]).toBe(1);
  expect(out[0]).toBe(0);
});

test('fillHoles leaves a hole that opens to the border', () => {
  const out = fillHoles(ringMask(true), W, H);
  expect(out[9 * W + 9]).toBe(0);
});

test('smoothEdge is solid inside, clear far outside, soft at the edge', () => {
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 10) mask[y * W + x] = 1;
  const alpha = smoothEdge(mask, W, H, 2);
  expect(alpha[10 * W + 2]).toBe(255);
  expect(alpha[10 * W + 18]).toBe(0);
  const edge = alpha[10 * W + 10];
  expect(edge > 0 && edge < 255).toBeTruthy();
});

test('keepComponents keeps only regions touching a seed', () => {
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) if (inSquare(x, y, 1, 1, 4) || inSquare(x, y, 12, 12, 4)) mask[y * W + x] = 1;
  }
  const out = keepComponents(mask, W, H, [[2, 2]]);
  expect(out[3 * W + 3]).toBe(1);
  expect(out[13 * W + 13]).toBe(0);
});

test('patchFromAbove copies the texture from rows above into a rectangle', () => {
  // A diagonal texture; a black "label" sits at x 12..17, y 12..15.
  const shade = (x, y) => ((x + y) % 7) * 30;
  const rgba = image((x, y) => (x >= 12 && x < 18 && y >= 12 && y < 16 ? [0, 0, 0] : [shade(x, y), 0, 0]));
  patchFromAbove(rgba, W, H, { x0: 11, y0: 11, x1: 19, y1: 17 }, 8, 0);
  for (let y = 11; y < 17; y++) {
    for (let x = 11; x < 19; x++) expect(rgba[(y * W + x) * 4],  `pixel ${x},${y}`).toBe(shade(x, y - 8));
  }
  expect(rgba[(5 * W + 5) * 4]).toBe(shade(5, 5)); // outside the rectangle untouched
});

test('patchFromAbove leaves pixels outside the inside() test untouched', () => {
  const rgba = image((x, y) => (y >= 12 ? [0, 0, 0] : [200, 0, 0]));
  patchFromAbove(rgba, W, H, { x0: 0, y0: 12, x1: 20, y1: 16 }, 8, 0, (x) => x < 10);
  expect(rgba[(13 * W + 5) * 4]).toBe(200);
  expect(rgba[(13 * W + 15) * 4]).toBe(0);
});
