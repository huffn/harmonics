// The finale: once all four harmonics are lit, every light on the table runs
// straight to the stone-circle marking. White comes from the opened seal, and
// each color from wherever its harmonic sits.
import { COLORS } from './geometry';
import type { Level } from './level';
import type { TableState } from './state';
import type { Segment, TraceResult } from './trace';

// Beams stop on the marking's ring of glyphs (in cells from its center), leaving the compass clear.
const RING = 0.4;

export function convergeBeams(level: Level, s: TableState, result: TraceResult): Segment[] {
  if (!result.solved) return [];
  const mx = level.mark.x + level.mark.width / 2;
  const my = level.mark.y + level.mark.height / 2;
  const from = (color: string, c: number, r: number): Segment => {
    const x1 = c + 0.5;
    const y1 = r + 0.5;
    const d = Math.hypot(mx - x1, my - y1);
    const k = (d - RING) / d;
    return { color, x1, y1, x2: x1 + (mx - x1) * k, y2: y1 + (my - y1) * k };
  };
  const beams = [from('white', level.seal.c, level.seal.r)];
  for (const color of COLORS) {
    const slot = s.harmonics[color];
    if (slot) beams.push(from(color, level.slots[slot].c, level.slots[slot].r));
  }
  return beams;
}
