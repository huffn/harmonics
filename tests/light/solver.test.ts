// @ts-nocheck -- ported untyped from the original JS tests; fixtures are partial levels
import { test, expect } from 'vitest';
import { minMirrors } from '../../tools/light/solver';

// Same 9×9 board as the trace tests: every colored diagonal from the splitter
// runs straight into its slot when white arrives from below.
const base = () => ({
  cols: 9, rows: 9,
  emitter: { c: 1, r: 8 },
  splitter: { c: 4, r: 4 },
  seal: { c: 0, r: 0 },
  pillars: [],
  slots: { nw: { c: 2, r: 2 }, ne: { c: 6, r: 2 }, se: { c: 6, r: 6 }, sw: { c: 2, r: 6 } },
  solution: [],
});

test('on an open board one white mirror is enough, in whatever color order fits', () => {
  // Sent in from the side, the four diagonals still land on the four slots,
  // just with the colors in a different order, which is allowed.
  const res = minMirrors(base());
  expect(res.total).toBe(1);
  expect(res.white).toBe(1);
  expect(res.perColor).toStrictEqual({ green: 0, red: 0, yellow: 0, blue: 0 });
  expect(Object.values(res.assignment).sort()).toStrictEqual(['ne', 'nw', 'se', 'sw']);
});

test('a slot off the diagonal costs one mirror', () => {
  const level = base();
  level.slots.nw = { c: 2, r: 4 };
  const res = minMirrors(level);
  expect(res.total).toBe(3);
});

test('a boxed-in slot is unreachable', () => {
  const level = base();
  level.pillars = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) if (dc || dr) level.pillars.push({ c: 2 + dc, r: 2 + dr });
  }
  const res = minMirrors(level);
  expect(res.total).toBe(Infinity);
});
