import { test, expect } from 'vitest';
import path from 'node:path';
import sharp from 'sharp';
import * as S from '#lib/light/state';
import { trace } from '#lib/light/trace';
import { minMirrors } from '../../tools/light/solver';
import { level } from '#lib/light/level';
import type { Color } from '#lib/light/geometry';

const ALL: Color[] = ['green', 'red', 'yellow', 'blue'];

function solvedState(mirrors = level.solution, harmonics: Color[] = ALL) {
  const s = S.createState(level);
  s.splitterPlaced = true;
  s.lightUncovered = true;
  for (const m of mirrors) s.mirrors.set(`${m.c},${m.r}`, m.angle);
  for (const color of harmonics) s.harmonics[color] = level.answer[color];
  return s;
}

test('the grid is 25 × 15 with the fixed pieces from the spec', () => {
  expect(level.cols).toBe(25);
  expect(level.rows).toBe(15);
  expect(level.splitter).toStrictEqual({ c: 13, r: 4 });
  expect(level.seal).toStrictEqual({ c: 12, r: 1 });
  expect(level.emitter).toStrictEqual({ c: 10, r: 9 }); // the "RO" of The Broken
});

test('the solution is 10 mirrors on empty cells', () => {
  expect(level.solution.length).toBe(10);
  for (const m of level.solution) expect(S.cellKind(level, m.c, m.r)).toBe('empty');
  expect(new Set(level.solution.map((m) => `${m.c},${m.r}`)).size).toBe(10);
});

test('the solution solves the puzzle', () => {
  expect(trace(level, solvedState()).solved).toBe(true);
});

test('without harmonics the solution does not solve', () => {
  expect(trace(level, solvedState(level.solution, [])).solved).toBe(false);
});

test('every mirror in the solution is required', () => {
  for (let i = 0; i < level.solution.length; i++) {
    const fewer = level.solution.filter((_, j) => j !== i);
    expect(trace(level, solvedState(fewer)).solved,  `mirror ${i} is not needed`).toBe(false);
  }
});

test('the intended answer puts each harmonic in a different temple', () => {
  expect(Object.keys(level.slots).sort()).toStrictEqual(['dhruv', 'galatea', 'samitra', 'volund']);
  expect(Object.values(level.answer).sort()).toStrictEqual(['dhruv', 'galatea', 'samitra', 'volund']);
});

test('the puzzle needs at least 7 mirrors', () => {
  expect(minMirrors(level).total >= 7).toBeTruthy();
});

test('no pillar sits on a fixed piece', () => {
  for (const p of level.pillars) expect(S.cellKind(level, p.c, p.r)).toBe('pillar');
});

async function maskValue(name: string, cell: { c: number; r: number }) {
  const file = path.join(import.meta.dirname, '..', '..', 'static', 'light', 'assets', `mask-${name}.png`);
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const x = Math.floor(((cell.c + 0.5) / level.cols) * info.width);
  const y = Math.floor(((cell.r + 0.5) / level.rows) * info.height);
  return data[(y * info.width + x) * info.channels];
}

test('each slot sits inside its country and the seal in the Radiant Seat', async () => {
  for (const country of Object.keys(level.slots)) {
    expect((await maskValue(country, level.slots[country])) > 128,  `${country} slot outside its country`).toBeTruthy();
  }
  expect((await maskValue('radiant', level.seal)) > 128,  'seal outside the Radiant Seat').toBeTruthy();
});
