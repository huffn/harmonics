// The Table of Light's single layout. Each of the five beams needs two mirrors
// in the intended solution; pillars block every one-mirror shortcut.
// tools/light/solver.ts estimates at least 8 mirrors (beams routed independently, any
// harmonic in any temple).
import type { Color } from './geometry';

export interface Cell {
	c: number;
	r: number;
}
export interface Level {
	cols: number;
	rows: number;
	emitter: Cell;
	splitter: Cell;
	seal: Cell;
	slots: Record<string, Cell>;
	answer: Record<Color, string>;
	pillars: Cell[];
	solution: (Cell & { angle: number })[];
}

export const level: Level = {
  cols: 25,
  rows: 15,
  emitter: { c: 10, r: 9 }, // the "RO" of The Broken
  splitter: { c: 13, r: 4 },
  seal: { c: 12, r: 1 },
  // Temple slots, one per country. Any harmonic fits any slot.
  slots: {
    dhruv: { c: 3, r: 4 },
    galatea: { c: 9, r: 5 },
    samitra: { c: 20, r: 3 },
    volund: { c: 23, r: 2 },
  },
  // Where the intended solution puts each harmonic.
  answer: { green: 'dhruv', red: 'galatea', yellow: 'samitra', blue: 'volund' },
  pillars: [
    { c: 21, r: 2 }, { c: 19, r: 4 }, { c: 20, r: 4 }, { c: 11, r: 5 },
    { c: 9, r: 6 }, { c: 9, r: 8 }, { c: 8, r: 4 },
    { c: 10, r: 4 }, // stops white reaching the splitter with one mirror from The Broken
    // scenery: kept only where they leave the solution and the estimate intact
    { c: 16, r: 5 }, { c: 20, r: 9 }, { c: 1, r: 8 }, { c: 18, r: 8 }, { c: 0, r: 13 },
    { c: 11, r: 12 }, { c: 7, r: 8 }, { c: 15, r: 7 }, { c: 5, r: 10 }, { c: 0, r: 2 },
    { c: 21, r: 11 }, { c: 6, r: 1 }, { c: 0, r: 10 }, { c: 22, r: 9 }, { c: 12, r: 0 },
    { c: 2, r: 0 }, { c: 9, r: 1 },
  ],
  solution: [
    // white: north from The Broken, east along row 8, north into the splitter
    { c: 10, r: 8, angle: 2 }, { c: 13, r: 8, angle: 2 },
    // green: northwest, west along row 2, southwest into Dhruv
    { c: 11, r: 2, angle: 7 }, { c: 5, r: 2, angle: 1 },
    // blue: northeast, east along row 1, southeast into Volund Etherium
    { c: 16, r: 1, angle: 1 }, { c: 22, r: 1, angle: 7 },
    // yellow: southeast, north up column 17, southeast into Samitra
    { c: 17, r: 8, angle: 1 }, { c: 17, r: 0, angle: 1 },
    // red: southwest, west along row 7, northeast into Galatea
    { c: 10, r: 7, angle: 1 }, { c: 7, r: 7, angle: 5 },
  ],
};
