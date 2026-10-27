// @ts-nocheck -- ported untyped from the original JS tests; fixtures are partial levels
import { test, expect } from 'vitest';
import * as S from '#lib/light/state';
import { trace } from '#lib/light/trace';

// 9×9 board. Two "/" mirrors at (1,7) and (4,7) carry the white beam from the
// emitter at (1,8) into the splitter at (4,4) from below. Each colored diagonal
// then runs straight through its slot.
const base = () => ({
  cols: 9, rows: 9,
  emitter: { c: 1, r: 8 },
  splitter: { c: 4, r: 4 },
  seal: { c: 0, r: 0 },
  pillars: [],
  slots: { nw: { c: 2, r: 2 }, ne: { c: 6, r: 2 }, se: { c: 6, r: 6 }, sw: { c: 2, r: 6 } },
  solution: [{ c: 1, r: 7, angle: 2 }, { c: 4, r: 7, angle: 2 }],
});

// The colors that reach each slot straight from the splitter on this board.
const NATURAL = { green: 'nw', blue: 'ne', yellow: 'se', red: 'sw' };

// `harmonics` is a list of colors placed in their natural slots, or a
// { color: slot } object.
function withMirrors(level, mirrors, harmonics = [], splitterPlaced = true) {
  const s = S.createState(level);
  s.lightUncovered = true;
  s.splitterPlaced = splitterPlaced;
  for (const m of mirrors) s.mirrors.set(`${m.c},${m.r}`, m.angle);
  const placed = Array.isArray(harmonics) ? Object.fromEntries(harmonics.map((c) => [c, NATURAL[c]])) : harmonics;
  for (const [color, slot] of Object.entries(placed)) s.harmonics[color] = slot;
  return s;
}

const ofColor = (res, color) => res.segments.filter((g) => g.color === color);
const ALL = ['green', 'red', 'yellow', 'blue'];

test('with no mirrors white goes straight up and off the top', () => {
  const level = base();
  const res = trace(level, withMirrors(level, []));
  expect(ofColor(res, 'white')).toStrictEqual([{ color: 'white', x1: 1.5, y1: 8.5, x2: 1.5, y2: 0 }]);
});

test('a "\\" mirror above the emitter sends white west', () => {
  const level = base();
  const res = trace(level, withMirrors(level, [{ c: 1, r: 7, angle: 6 }]));
  expect(ofColor(res, 'white')).toStrictEqual([
    { color: 'white', x1: 1.5, y1: 8.5, x2: 1.5, y2: 7.5 },
    { color: 'white', x1: 1.5, y1: 7.5, x2: 0, y2: 7.5 },
  ]);
});

test('white entering the splitter from below emits the four diagonals', () => {
  const level = base();
  const res = trace(level, withMirrors(level, level.solution));
  const first = (color) => ofColor(res, color)[0];
  const sign = (g) => [Math.sign(g.x2 - g.x1), Math.sign(g.y2 - g.y1)];
  for (const color of ALL) expect([first(color).x1, first(color).y1]).toStrictEqual([4.5, 4.5]);
  expect(sign(first('green'))).toStrictEqual([-1, -1]);
  expect(sign(first('blue'))).toStrictEqual([1, -1]);
  expect(sign(first('yellow'))).toStrictEqual([1, 1]);
  expect(sign(first('red'))).toStrictEqual([-1, 1]);
});

test('with no splitter placed, white passes through its empty slot', () => {
  const level = base();
  const res = trace(level, withMirrors(level, level.solution, [], false));
  expect(res.segments.filter((g) => g.color !== 'white').length).toBe(0);
  // Up column 4 past the splitter cell at (4,4) and off the top edge.
  expect(ofColor(res, 'white').map((g) => [g.x2, g.y2]).at(-1)).toStrictEqual([4.5, 0]);
});

test('the white beam stops at the splitter', () => {
  const level = base();
  const res = trace(level, withMirrors(level, level.solution));
  const last = ofColor(res, 'white').at(-1);
  expect([last.x2, last.y2]).toStrictEqual([4.5, 4.5]);
});

test('a matching beam lights its harmonic and stops there', () => {
  const level = base();
  const res = trace(level, withMirrors(level, level.solution, ['green']));
  expect(res.lit.green).toBe(true);
  expect(ofColor(res, 'green').map((g) => [g.x2, g.y2]).at(-1)).toStrictEqual([2.5, 2.5]);
});

test('a wrong color stops at a placed harmonic without lighting it', () => {
  const level = base();
  // Green sits where the red beam lands.
  const res = trace(level, withMirrors(level, level.solution, { green: 'sw' }));
  expect(res.lit.green).toBe(false);
  expect(ofColor(res, 'red').map((g) => [g.x2, g.y2]).at(-1)).toStrictEqual([2.5, 6.5]);
});

test('an empty slot lets a beam pass without lighting', () => {
  const level = base();
  const res = trace(level, withMirrors(level, level.solution));
  expect(res.lit.green).toBe(false);
  expect(ofColor(res, 'green').map((g) => [g.x2, g.y2]).at(-1)).toStrictEqual([1, 1]);
});

test('a diagonal beam cannot slip between corner-touching pillars', () => {
  const level = base();
  level.pillars = [{ c: 5, r: 4 }, { c: 4, r: 3 }];
  const res = trace(level, withMirrors(level, level.solution));
  for (const g of ofColor(res, 'blue')) expect(g.x2 <= 5 && g.y2 >= 4).toBeTruthy();
});

test('a colored beam hitting the splitter is blocked', () => {
  const level = base();
  // Bounce green straight back with a mirror perpendicular to it at (3,3).
  const res = trace(level, withMirrors(level, [...level.solution, { c: 3, r: 3, angle: 2 }]));
  const ends = ofColor(res, 'green').map((g) => [g.x2, g.y2]);
  expect(ends.at(-1)).toStrictEqual([4, 4]);
});

test('all four lit solves; removing a mirror un-solves', () => {
  const level = base();
  const s = withMirrors(level, level.solution, ALL);
  expect(trace(level, s).solved).toBe(true);
  S.removeMirror(s, 4, 7);
  const res = trace(level, s);
  expect(res.solved).toBe(false);
  expect(res.lit).toStrictEqual({ green: false, red: false, yellow: false, blue: false });
});

test('tracing always terminates on random boards', () => {
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = 0; i < 300; i++) {
    const level = base();
    const s = S.createState(level);
    s.lightUncovered = true;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (S.cellKind(level, c, r) === 'empty' && rand() < 0.3) s.mirrors.set(`${c},${r}`, Math.floor(rand() * 8));
      }
    }
    const slots = ['nw', 'ne', 'se', 'sw'];
    for (const color of ALL) s.harmonics[color] = rand() < 0.5 ? slots.splice(Math.floor(rand() * slots.length), 1)[0] : null;
    const res = trace(level, s);
    expect(res.segments.length <= 5 * 8 * 81).toBeTruthy();
  }
});

test('white light sent straight at the seal is flagged', () => {
  const level = base();
  // North up column 1, then a mirror at (1,1) turns it northwest into the seal at (0,0).
  const res = trace(level, withMirrors(level, [{ c: 1, r: 1, angle: 5 }]));
  expect(res.whiteHitsSeal).toBe(true);
});

test('the seal flag stays off otherwise', () => {
  const level = base();
  expect(trace(level, withMirrors(level, [])).whiteHitsSeal).toBe(false);
  // Green also reaches the seal on this board; only white counts.
  expect(trace(level, withMirrors(level, level.solution)).whiteHitsSeal).toBe(false);
});

test('a beam reaching the edge of the table makes an impact there', () => {
  const level = base();
  expect(trace(level, withMirrors(level, [])).impacts).toStrictEqual([{ color: 'white', x: 1.5, y: 0, dir: 2 }]);
});

test('beams stopped by something report where and which way they hit', () => {
  const level = base();
  level.pillars = [{ c: 1, r: 3 }];
  // White runs north up column 1 into the pillar at (1,3): it stops on the edge at y = 4.
  const res = trace(level, withMirrors(level, []));
  expect(res.impacts).toStrictEqual([{ color: 'white', x: 1.5, y: 4, dir: 2 }]);
});

test('white entering the splitter is not an impact, a beam caught by a harmonic is', () => {
  const level = base();
  const res = trace(level, withMirrors(level, level.solution, ['green']));
  expect(!res.impacts.some((i) => i.color === 'white')).toBeTruthy();
  expect(res.impacts.find((i) => i.color === 'green')).toStrictEqual({ color: 'green', x: 2.5, y: 2.5, dir: 3 });
});

test('while the bowl covers the light there is no light at all', () => {
  const level = base();
  const s = withMirrors(level, level.solution, ['green', 'red', 'yellow', 'blue']);
  s.lightUncovered = false;
  const res = trace(level, s);
  expect(res.segments).toStrictEqual([]);
  expect(res.impacts).toStrictEqual([]);
  expect(res.solved).toBe(false);
});
