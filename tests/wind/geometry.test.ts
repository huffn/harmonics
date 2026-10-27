import { describe, expect, test } from 'vitest'
import { LEVEL_ORDER, LEVELS } from '#lib/wind/levels'
import { columnLimits, longestColumn, offsetForPosition, snapPosition } from '#lib/wind/geometry'

describe('columnLimits', () => {
	test('full-length column runs from 0 up by (n-1) boxes', () =>
		expect(columnLimits(4, 4, 100)).toEqual({ lower: -0, upper: -300 }))
	test('shorter column is shifted half a box per missing letter', () =>
		expect(columnLimits(5, 3, 100)).toEqual({ lower: -100, upper: -300 }))
})

test('offsetForPosition matches the original startPosition', () => {
	// colPosition * -BOX_HEIGHT + (longest - len) * -(BOX_HEIGHT / 2)
	for (const [pos, longest, len, box] of [[0, 4, 4, 135], [2, 5, 3, 145], [3, 5, 4, 145]])
		expect(offsetForPosition(pos, longest, len, box)).toBe(pos * -box + (longest - len) * -(box / 2))
})

describe('snapPosition', () => {
	const box = 100
	test('every resting offset maps back to its position', () => {
		for (const id of LEVEL_ORDER) {
			const longest = longestColumn(id)
			for (const c of LEVELS[id].columns)
				c.letters.forEach((_, p) =>
					expect(snapPosition(offsetForPosition(p, longest, c.letters.length, box), longest, c.letters.length, box)).toBe(p))
		}
	})
	test('clamps past the limits', () => {
		expect(snapPosition(250, 4, 4, box)).toBe(0)
		expect(snapPosition(-900, 4, 4, box)).toBe(3)
		expect(snapPosition(-40, 5, 3, box)).toBe(0) // above the shifted lower limit (-100)
	})
	test('snaps to the nearest letter', () => {
		expect(snapPosition(-140, 4, 4, box)).toBe(1)
		expect(snapPosition(-160, 4, 4, box)).toBe(2)
	})
	test('an exact midpoint goes to the lower index', () => {
		expect(snapPosition(-150, 4, 4, box)).toBe(1)
		expect(snapPosition(-150, 5, 3, box)).toBe(0) // lower = -100, midpoint between 0 and 1
	})
})

test('longestColumn', () => {
	for (const id of LEVEL_ORDER)
		expect(longestColumn(id)).toBe(Math.max(...LEVELS[id].columns.map((c) => c.letters.length)))
})
