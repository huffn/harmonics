import { test, expect } from 'vitest';
import * as S from '#lib/light/state';
import { trace } from '#lib/light/trace';
import { convergeBeams } from '#lib/light/finale';
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

test('no converging beams until solved', () => {
  const s = solvedState(level.solution, ['green', 'red', 'yellow']);
  expect(convergeBeams(level, s, trace(level, s))).toEqual([]);
});

test('five beams end on the marking: white from the seal, each color from its harmonic', () => {
  const s = solvedState();
  const beams = convergeBeams(level, s, trace(level, s));
  const mx = level.mark.x + level.mark.width / 2;
  const my = level.mark.y + level.mark.height / 2;
  expect(beams.map((b) => b.color)).toEqual(['white', 'green', 'red', 'yellow', 'blue']);
  for (const b of beams) expect([b.x2, b.y2]).toEqual([mx, my]);
  expect([beams[0].x1, beams[0].y1]).toEqual([12.5, 1.5]); // the seal
  expect([beams[1].x1, beams[1].y1]).toEqual([3.5, 4.5]); // green in Dhruv
});

test('beams start wherever the harmonics actually sit', () => {
  const s = solvedState();
  const result = { ...trace(level, s), solved: true };
  s.harmonics.green = 'volund';
  s.harmonics.blue = 'dhruv';
  const beams = convergeBeams(level, s, result);
  expect([beams[1].x1, beams[1].y1]).toEqual([23.5, 2.5]); // green, now in Volund
});
