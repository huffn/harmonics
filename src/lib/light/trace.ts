// Follows every beam across the board. Coordinates are board units with cell
// centers at (c + 0.5, r + 0.5). A beam blocked by a pillar, the seal, the
// emitter, a corner squeeze or the splitter (colored light) ends on the edge
// between the two cells; a beam caught by a placed harmonic ends at its center.
import { DIRS, reflect, splitterOutputs, type Color } from './geometry';
import type { Level } from './level';
import * as state from './state';
import type { TableState } from './state';

export interface Segment {
  color: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export interface Impact {
  color: string;
  x: number;
  y: number;
  dir: number;
}
export interface TraceResult {
  segments: Segment[];
  lit: Record<Color, boolean>;
  solved: boolean;
  whiteHitsSeal: boolean;
  impacts: Impact[];
}
interface Beam {
  color: string;
  c: number;
  r: number;
  dir: number;
}

const BLOCKERS = new Set<string>(['out', 'pillar', 'seal', 'emitter']);

export function trace(level: Level, s: TableState): TraceResult {
  const segments: Segment[] = [];
  const lit: Record<Color, boolean> = { green: false, red: false, yellow: false, blue: false };
  let whiteHitsSeal = false;
  const impacts: Impact[] = []; // where a beam runs into something and stops
  const visited = new Set();
  // Until the bowl is lifted there is no light at all.
  const queue: Beam[] = s.lightUncovered ? [{ color: 'white', c: level.emitter.c, r: level.emitter.r, dir: 2 }] : [];

  while (queue.length) {
    let { color, c, r, dir } = queue.shift()!;
    let x1 = c + 0.5;
    let y1 = r + 0.5;
    const push = (x2: number, y2: number) => {
      if (x2 !== x1 || y2 !== y1) segments.push({ color, x1, y1, x2, y2 });
    };
    const stopAt = (x: number, y: number) => {
      push(x, y);
      impacts.push({ color, x, y, dir });
    };

    for (;;) {
      const { dx, dy } = DIRS[dir];
      const nc = c + dx;
      const nr = r + dy;
      const edgeX = c + 0.5 + dx / 2;
      const edgeY = r + 0.5 + dy / 2;

      if (dx && dy && state.cellKind(level, c + dx, r) === 'pillar' && state.cellKind(level, c, r + dy) === 'pillar') {
        stopAt(edgeX, edgeY);
        break;
      }

      const seen = `${color}|${nc}|${nr}|${dir}`;
      if (visited.has(seen)) {
        push(nc + 0.5, nr + 0.5);
        break;
      }
      visited.add(seen);

      const kind = state.cellKind(level, nc, nr);
      if (BLOCKERS.has(kind)) {
        if (kind === 'seal' && color === 'white') whiteHitsSeal = true;
        stopAt(edgeX, edgeY); // the table's rim counts too
        break;
      }

      if (kind === 'splitter' && s.splitterPlaced) {
        if (color !== 'white') {
          stopAt(edgeX, edgeY);
          break;
        }
        push(nc + 0.5, nr + 0.5);
        for (const out of splitterOutputs(dir)) queue.push({ color: out.color, c: nc, r: nr, dir: out.dir });
        break;
      }

      c = nc;
      r = nr;

      if (kind === 'slot') {
        const held = state.harmonicIn(s, state.slotAt(level, c, r)!);
        if (held) {
          // A placed harmonic catches any beam; only its own color lights it.
          if (color === held) lit[held] = true;
          stopAt(c + 0.5, r + 0.5);
          break;
        }
        continue;
      }

      const angle = s.mirrors.get(`${c},${r}`);
      if (angle !== undefined) {
        const out = reflect(dir, angle);
        if (out !== dir) {
          push(c + 0.5, r + 0.5);
          x1 = c + 0.5;
          y1 = r + 0.5;
          dir = out;
        }
      }
    }
  }

  const solved = lit.green && lit.red && lit.yellow && lit.blue;
  return { segments, lit, solved, whiteHitsSeal, impacts };
}
