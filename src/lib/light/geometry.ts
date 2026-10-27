// Directions are indexed 0..7 at 45° steps, counter-clockwise from east.
// Screen y points down, so "north" is dy = -1.
export type Color = 'green' | 'red' | 'yellow' | 'blue';

export const DIRS = [
	{ dx: 1, dy: 0 }, // 0 E
	{ dx: 1, dy: -1 }, // 1 NE
	{ dx: 0, dy: -1 }, // 2 N
	{ dx: -1, dy: -1 }, // 3 NW
	{ dx: -1, dy: 0 }, // 4 W
	{ dx: -1, dy: 1 }, // 5 SW
	{ dx: 0, dy: 1 }, // 6 S
	{ dx: 1, dy: 1 } // 7 SE
];

export const COLORS: Color[] = ['green', 'red', 'yellow', 'blue'];

const mod8 = (n: number): number => ((n % 8) + 8) % 8;

// A mirror at angle index m lies along 22.5°·m. Reflection: out = 2φ − θ,
// which in index units is m − k.
export function reflect(dir: number, mirrorAngle: number): number {
	return mod8(mirrorAngle - dir);
}

// Colors leave on the diagonals relative to the incoming white beam.
export function splitterOutputs(inDir: number): { color: Color; dir: number }[] {
	return [
		{ color: 'green', dir: mod8(inDir + 1) },
		{ color: 'blue', dir: mod8(inDir - 1) },
		{ color: 'yellow', dir: mod8(inDir - 3) },
		{ color: 'red', dir: mod8(inDir + 3) }
	];
}
