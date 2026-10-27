// Column sizing and drag math, from windHarmonic's StylesContext.tsx and Column.tsx.
// Offsets are the column's translateY in pixels; position is the index of the letter
// sitting in the selection bar.
import { LEVELS, type LevelId } from './levels'

/** BOX_HEIGHT (px) and LETTER_SIZE (rem) per level, as in the GM's StylesContext. */
export const LEVEL_STYLES: Record<LevelId, { boxHeight: number; letterSize: number }> = {
	EASY: { boxHeight: 135, letterSize: 5 },
	MEDIUM: { boxHeight: 145, letterSize: 5 },
	HARD: { boxHeight: 145, letterSize: 2.5 }
}
export const ARROW_WIDTH_REM = 2
/** Snap transition after a drag (seconds). */
export const COLUMN_ANIMATION_S = 0.1
/** "Word found" grow of the selected letters (seconds). */
export const WORD_GROW_S = 0.2

export function longestColumn(id: LevelId): number {
	return Math.max(...LEVELS[id].columns.map((c) => c.letters.length))
}

/**
 * COLUMN_LOWER_LIMIT / COLUMN_UPPER_LIMIT: the offsets of the first and last letter.
 * Shorter columns are shifted by half a box per missing letter, since the flex row
 * centres them vertically against the longest one.
 */
export function columnLimits(longest: number, length: number, box: number) {
	const lower = (longest - length) * -(box / 2)
	const upper = lower - (length - 1) * box
	return { lower, upper }
}

export function offsetForPosition(position: number, longest: number, length: number, box: number): number {
	return columnLimits(longest, length, box).lower - position * box
}

/**
 * The letter a released column snaps to: beyond the limits it clamps to the end letter,
 * otherwise the nearest letter, with an exact midpoint going to the lower index (the
 * original's `distanceToBefore <= distanceToAfter`).
 */
export function snapPosition(offset: number, longest: number, length: number, box: number): number {
	const { lower, upper } = columnLimits(longest, length, box)
	if (offset > lower) return 0
	if (offset < upper) return length - 1
	const steps = (lower - offset) / box
	return Math.min(Math.max(Math.ceil(steps - 0.5), 0), length - 1)
}
