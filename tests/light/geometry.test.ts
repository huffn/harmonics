import { test, expect } from 'vitest';
import { reflect, splitterOutputs } from '#lib/light/geometry';

test('horizontal mirror bounces NE to SE', () => expect(reflect(1, 0)).toBe(7));
test('beam parallel to mirror passes', () => expect(reflect(0, 0)).toBe(0));
test('beam perpendicular to mirror returns', () => expect(reflect(2, 0)).toBe(6));
test('"/" turns north-moving beam east', () => expect(reflect(2, 2)).toBe(0));
test('"\\" turns north-moving beam west', () => expect(reflect(2, 6)).toBe(4));
test('22.5° mirror turns east beam 45°', () => expect(reflect(0, 1)).toBe(1));

test('every reflection stays in 0..7', () => {
  for (let d = 0; d < 8; d++) {
    for (let m = 0; m < 8; m++) {
      const r = reflect(d, m);
      expect(r >= 0 && r < 8).toBeTruthy();
    }
  }
});

test('splitter, white moving north', () => {
  expect(splitterOutputs(2)).toStrictEqual([
    { color: 'green', dir: 3 },
    { color: 'blue', dir: 1 },
    { color: 'yellow', dir: 7 },
    { color: 'red', dir: 5 },
  ]);
});

test('splitter never emits backwards', () => {
  for (let d = 0; d < 8; d++) {
    for (const o of splitterOutputs(d)) expect(o.dir).not.toBe((d + 4) % 8);
  }
});
