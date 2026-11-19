// The finale: once all four harmonics are lit, every light on the table runs
// straight to the stone-circle marking. White comes from the opened seal, and
// each color from wherever its harmonic sits.
import { COLORS } from './geometry';
import type { Level } from './level';
import type { TableState } from './state';
import type { Segment, TraceResult } from './trace';

export function convergeBeams(level: Level, s: TableState, result: TraceResult): Segment[] {
  if (!result.solved) return [];
  const x2 = level.mark.x + level.mark.width / 2;
  const y2 = level.mark.y + level.mark.height / 2;
  const from = (color: string, c: number, r: number): Segment => ({ color, x1: c + 0.5, y1: r + 0.5, x2, y2 });
  const beams = [from('white', level.seal.c, level.seal.r)];
  for (const color of COLORS) {
    const slot = s.harmonics[color];
    if (slot) beams.push(from(color, level.slots[slot].c, level.slots[slot].r));
  }
  return beams;
}
