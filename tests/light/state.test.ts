// @ts-nocheck -- ported untyped from the original JS tests; fixtures are partial levels
import { test, expect } from 'vitest';
import * as S from '#lib/light/state';

const level = {
  cols: 5, rows: 5,
  emitter: { c: 2, r: 4 },
  splitter: { c: 2, r: 2 },
  seal: { c: 0, r: 0 },
  pillars: [{ c: 4, r: 4 }],
  slots: { west: { c: 0, r: 2 }, east: { c: 4, r: 2 }, nw: { c: 1, r: 0 }, ne: { c: 3, r: 0 } },
  solution: [],
};

const emptyCells = () => {
  const out = [];
  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < level.cols; c++) if (S.cellKind(level, c, r) === 'empty') out.push({ c, r });
  }
  return out;
};

test('cellKind identifies fixed pieces and out of bounds', () => {
  expect(S.cellKind(level, 4, 4)).toBe('pillar');
  expect(S.cellKind(level, 0, 2)).toBe('slot');
  expect(S.cellKind(level, 2, 2)).toBe('splitter');
  expect(S.cellKind(level, 0, 0)).toBe('seal');
  expect(S.cellKind(level, 2, 4)).toBe('emitter');
  expect(S.cellKind(level, 1, 1)).toBe('empty');
  expect(S.cellKind(level, 5, 0)).toBe('out');
  expect(S.cellKind(level, 0, -1)).toBe('out');
});

test('mirrors cannot go on fixed pieces', () => {
  const s = S.createState(level);
  for (const [c, r] of [[4, 4], [0, 2], [2, 2], [0, 0], [2, 4]]) {
    expect(S.placeMirror(level, s, c, r)).toStrictEqual({ ok: false, reason: 'occupied' });
  }
});

test('mirrors cannot stack on a mirror', () => {
  const s = S.createState(level);
  expect(S.placeMirror(level, s, 1, 1)).toStrictEqual({ ok: true });
  expect(S.placeMirror(level, s, 1, 1)).toStrictEqual({ ok: false, reason: 'occupied' });
});

test('a new mirror starts at angle 2', () => {
  const s = S.createState(level);
  S.placeMirror(level, s, 1, 1);
  expect(s.mirrors.get('1,1')).toBe(2);
});

test('the 11th mirror is refused with 10 available', () => {
  const s = S.createState(level, 10);
  const cells = emptyCells();
  for (let i = 0; i < 10; i++) expect(S.placeMirror(level, s, cells[i].c, cells[i].r).ok).toBe(true);
  expect(S.placeMirror(level, s, cells[10].c, cells[10].r)).toStrictEqual({ ok: false, reason: 'none-left' });
});

test('rotation wraps both ways', () => {
  const s = S.createState(level);
  S.placeMirror(level, s, 1, 1);
  for (let i = 0; i < 8; i++) S.rotateMirror(s, 1, 1, 1);
  expect(s.mirrors.get('1,1')).toBe(2);
  s.mirrors.set('1,1', 0);
  S.rotateMirror(s, 1, 1, -1);
  expect(s.mirrors.get('1,1')).toBe(7);
});

test('removeMirror frees the cell', () => {
  const s = S.createState(level);
  S.placeMirror(level, s, 1, 1);
  S.removeMirror(s, 1, 1);
  expect(s.mirrors.size).toBe(0);
});

test('any harmonic fits any empty slot', () => {
  const s = S.createState(level);
  expect(S.placeHarmonic(level, s, 'green', 1, 1)).toStrictEqual({ ok: false, reason: 'not-a-slot' });
  expect(S.placeHarmonic(level, s, 'green', 4, 2)).toStrictEqual({ ok: true });
  expect(s.harmonics.green).toBe('east');
  expect(S.harmonicIn(s, 'east')).toBe('green');
  S.removeHarmonic(s, 'green');
  expect(s.harmonics.green).toBe(null);
  expect(S.harmonicIn(s, 'east')).toBe(null);
});

test('a slot holds one harmonic', () => {
  const s = S.createState(level);
  S.placeHarmonic(level, s, 'green', 4, 2);
  expect(S.placeHarmonic(level, s, 'red', 4, 2)).toStrictEqual({ ok: false, reason: 'occupied' });
  expect(s.harmonics.red).toBe(null);
});

test('placing a harmonic again moves it', () => {
  const s = S.createState(level);
  S.placeHarmonic(level, s, 'green', 4, 2);
  expect(S.placeHarmonic(level, s, 'green', 0, 2)).toStrictEqual({ ok: true });
  expect(s.harmonics.green).toBe('west');
  expect(S.harmonicIn(s, 'east')).toBe(null);
  expect(S.placeHarmonic(level, s, 'green', 0, 2)).toStrictEqual({ ok: true }); // dropped back where it was
});

test('lowering the count below placed mirrors keeps them and refuses more', () => {
  const s = S.createState(level, 10);
  const cells = emptyCells();
  for (let i = 0; i < 9; i++) S.placeMirror(level, s, cells[i].c, cells[i].r);
  S.setMirrorsAvailable(s, 7);
  expect(s.mirrors.size).toBe(9);
  expect(s.mirrorsAvailable).toBe(7);
  expect(S.placeMirror(level, s, cells[9].c, cells[9].r)).toStrictEqual({ ok: false, reason: 'none-left' });
});

test('setMirrorsAvailable clamps to 0..10', () => {
  const s = S.createState(level);
  S.setMirrorsAvailable(s, 99);
  expect(s.mirrorsAvailable).toBe(10);
  S.setMirrorsAvailable(s, -3);
  expect(s.mirrorsAvailable).toBe(0);
});

test('resetBoard clears pieces and keeps the count', () => {
  const s = S.createState(level, 6);
  S.placeMirror(level, s, 1, 1);
  S.placeHarmonic(level, s, 'green', 0, 2);
  S.resetBoard(s);
  expect(s.mirrors.size).toBe(0);
  expect(s.harmonics.green).toBe(null);
  expect(s.mirrorsAvailable).toBe(6);
});

test('serialize round-trips', () => {
  const s = S.createState(level, 8);
  S.placeMirror(level, s, 1, 1);
  S.rotateMirror(s, 1, 1, 1);
  S.placeHarmonic(level, s, 'red', 4, 2);
  const back = S.deserialize(level, S.serialize(s));
  expect(back.mirrorsAvailable).toBe(8);
  expect([...back.mirrors]).toStrictEqual([['1,1', 3]]);
  expect(back.harmonics).toStrictEqual({ green: null, red: 'east', yellow: null, blue: null });
});

test('deserialize rejects bad input', () => {
  expect(S.deserialize(level, '{garbage')).toBe(null);
  expect(S.deserialize(level, null)).toBe(null);
  expect(S.deserialize(level, '{"mirrors":[["0,0",99]]}')).toBe(null);
});

test('deserialize drops mirrors on non-empty cells', () => {
  const str = JSON.stringify({ mirrorsAvailable: 10, mirrors: [['4,4', 1], ['1,1', 2]], harmonics: {} });
  const back = S.deserialize(level, str);
  expect([...back.mirrors]).toStrictEqual([['1,1', 2]]);
});

test('the splitter starts off the board and only fits its own slot', () => {
  const s = S.createState(level);
  expect(s.splitterPlaced).toBe(false);
  expect(S.placeSplitter(level, s, 0, 2)).toStrictEqual({ ok: false, reason: 'not-its-slot' });
  expect(S.placeSplitter(level, s, 1, 1)).toStrictEqual({ ok: false, reason: 'not-its-slot' });
  expect(S.placeSplitter(level, s, 2, 2)).toStrictEqual({ ok: true });
  expect(s.splitterPlaced).toBe(true);
  S.removeSplitter(s);
  expect(s.splitterPlaced).toBe(false);
});

test('a harmonic cannot go in the splitter slot', () => {
  const s = S.createState(level);
  expect(S.placeHarmonic(level, s, 'green', 2, 2)).toStrictEqual({ ok: false, reason: 'not-a-slot' });
});

test('resetBoard takes the splitter back and serialize keeps it', () => {
  const s = S.createState(level);
  S.placeSplitter(level, s, 2, 2);
  expect(S.deserialize(level, S.serialize(s)).splitterPlaced).toBe(true);
  S.resetBoard(s);
  expect(s.splitterPlaced).toBe(false);
});

test('harmonics start hidden; revealing survives a reload and a reset', () => {
  const s = S.createState(level);
  expect(s.harmonicsRevealed).toBe(false);
  S.revealHarmonics(s);
  expect(S.deserialize(level, S.serialize(s)).harmonicsRevealed).toBe(true);
  S.resetBoard(s);
  expect(s.harmonicsRevealed).toBe(true);
});

test('the light starts covered; uncovering survives a reload and a reset', () => {
  const s = S.createState(level);
  expect(s.lightUncovered).toBe(false);
  S.uncoverLight(s);
  expect(S.deserialize(level, S.serialize(s)).lightUncovered).toBe(true);
  S.resetBoard(s);
  expect(s.lightUncovered).toBe(true);
});

test('deserialize drops harmonics in unknown or doubled-up slots', () => {
  const str = JSON.stringify({ mirrors: [], harmonics: { green: 'east', red: 'east', yellow: 'atlantis', blue: true } });
  const back = S.deserialize(level, str);
  expect(back.harmonics).toStrictEqual({ green: 'east', red: null, yellow: null, blue: null });
});
