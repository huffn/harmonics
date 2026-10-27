// Level-design aid: an estimate of the fewest mirrors a level needs. Each beam
// is routed on its own (beams sharing or crossing mirrors is ignored), with
// every slot assumed filled, as it is when the puzzle is solved. Any harmonic
// may sit in any slot, so every way of matching colors to slots is tried.
import { DIRS, COLORS, splitterOutputs } from '../../src/lib/light/geometry';
import type { Level } from '../../src/lib/light/level';
import { cellKind, slotAt } from '../../src/lib/light/state';

const BLOCKERS = new Set<string>(['out', 'pillar', 'seal', 'emitter']);

// 0-1 BFS over (cell, dir). Going straight through an empty cell is free;
// placing a mirror there to leave in any other direction costs 1.
// `onEnter(kind, c, r, dir)` returns 'goal', 'block' or 'pass' for non-empty cells.
type Verdict = 'goal' | 'block' | 'pass';
type Start = { c: number; r: number; dir: number };

function cheapest(
  level: Level,
  start: Start,
  onEnter: (kind: string, c: number, r: number, dir: number) => Verdict
) {
  const best = new Map<string, number>();
  const goals = new Map<number, number>();
  const deque = [{ ...start, cost: 0 }];
  const id = (c: number, r: number, d: number) => `${c},${r},${d}`;
  best.set(id(start.c, start.r, start.dir), 0);

  while (deque.length) {
    const { c, r, dir, cost } = deque.shift()!;
    if (best.get(id(c, r, dir))! < cost) continue;
    const { dx, dy } = DIRS[dir];
    if (dx && dy && cellKind(level, c + dx, r) === 'pillar' && cellKind(level, c, r + dy) === 'pillar') continue;
    const nc = c + dx;
    const nr = r + dy;
    const kind = cellKind(level, nc, nr);
    if (BLOCKERS.has(kind)) continue;

    const relax = (d: number, extra: number) => {
      const k = id(nc, nr, d);
      const next = cost + extra;
      if (best.has(k) && best.get(k)! <= next) return;
      best.set(k, next);
      if (extra) deque.push({ c: nc, r: nr, dir: d, cost: next });
      else deque.unshift({ c: nc, r: nr, dir: d, cost: next });
    };

    if (kind === 'empty') {
      relax(dir, 0);
      for (let d = 0; d < 8; d++) if (d !== dir) relax(d, 1);
      continue;
    }
    const verdict = onEnter(kind, nc, nr, dir);
    if (verdict === 'goal') {
      if (!goals.has(dir) || goals.get(dir)! > cost) goals.set(dir, cost);
    } else if (verdict === 'pass') {
      relax(dir, 0);
    }
  }
  return goals;
}

export function minMirrors(level: Level) {
  const whiteGoals = cheapest(level, { c: level.emitter.c, r: level.emitter.r, dir: 2 }, (kind) =>
    kind === 'splitter' ? 'goal' : 'block');

  const slots = Object.keys(level.slots);
  let result: {
    total: number;
    white: number;
    perColor: Record<string, number>;
    arrivalDir: number | null;
    assignment: Record<string, string> | null;
  } = { total: Infinity, white: Infinity, perColor: {}, arrivalDir: null, assignment: null };
  for (const [arrivalDir, white] of whiteGoals) {
    // cost[color][slot]: fewest mirrors to bring that color into that slot.
    const cost: Record<string, Record<string, number>> = {};
    for (const { color, dir } of splitterOutputs(arrivalDir)) {
      cost[color] = {};
      for (const slot of slots) {
        const goals = cheapest(level, { c: level.splitter.c, r: level.splitter.r, dir }, (kind, c, r) =>
          kind === 'slot' && slotAt(level, c, r) === slot ? 'goal' : 'block');
        cost[color][slot] = goals.size ? Math.min(...goals.values()) : Infinity;
      }
    }
    for (const order of permutations(slots)) {
      const assignment = Object.fromEntries(COLORS.map((color, i) => [color, order[i]]));
      const perColor = Object.fromEntries(COLORS.map((color) => [color, cost[color][assignment[color]]]));
      const total = white + Object.values(perColor).reduce((a, b) => a + b, 0);
      if (total < result.total) result = { total, white, perColor, arrivalDir, assignment };
    }
  }
  if (result.total === Infinity) {
    result.perColor = Object.fromEntries(COLORS.map((color) => [color, Infinity]));
  }
  return result;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
}
