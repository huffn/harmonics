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
  s.lightClaimed = true;
  return s;
}

test('no converging beams until solved', () => {
  const s = solvedState(level.solution, ['green', 'red', 'yellow']);
  expect(convergeBeams(level, s, trace(level, s))).toEqual([]);
});

test('no converging beams until the light harmonic is claimed', () => {
  const s = solvedState();
  s.lightClaimed = false;
  expect(convergeBeams(level, s, trace(level, s))).toEqual([]);
});

test('five beams run to the marking: white from the seal, each color from its harmonic', () => {
  const s = solvedState();
  const beams = convergeBeams(level, s, trace(level, s));
  const mx = level.mark.x + level.mark.width / 2;
  const my = level.mark.y + level.mark.height / 2;
  expect(beams.map((b) => b.color)).toEqual(['white', 'green', 'red', 'yellow', 'blue']);
  // Each stops on the marking's ring of glyphs, pointing at its center, leaving the compass clear.
  for (const b of beams) {
    expect(Math.hypot(b.x2 - mx, b.y2 - my)).toBeCloseTo(0.4, 6);
    const cross = (b.x2 - b.x1) * (my - b.y1) - (b.y2 - b.y1) * (mx - b.x1);
    expect(cross).toBeCloseTo(0, 6);
  }
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
