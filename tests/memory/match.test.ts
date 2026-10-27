import { expect, test, vi } from 'vitest'
import { allowedTypos, editDistance, isAcceptable, isMemoryState, normalizeAnswer } from '#lib/memory/match'
import { RIDDLES } from '#lib/memory/riddles'
import { gmKeys } from '#lib/shared/gm-keys'

test('case, punctuation, articles', () => expect(isAcceptable('  The Moon! ', ['moon'])).toBe(true))
test('accents ignored', () => expect(isAcceptable('café', ['cafe'])).toBe(true))
test('one typo in a medium word', () => expect(isAcceptable('shadw', ['shadow'])).toBe(true))
test('two typos in a long word', () => expect(isAcceptable('rememberance', ['remembrance'])).toBe(true))
test('short words need an exact match', () => expect(isAcceptable('son', ['sun'])).toBe(false))
test('two typos in a medium word fail', () => expect(isAcceptable('shdw', ['shadow'])).toBe(false))
test('empty input never matches', () => expect(isAcceptable('   ', ['a'])).toBe(false))
test('any listed answer counts', () => expect(isAcceptable('echo', ['silence', 'echo'])).toBe(true))
test('three riddles ship', () => expect(RIDDLES).toHaveLength(3))
test('the table answers solve each riddle in order', () => {
	expect(['Perception', 'Vision', 'Memory'].map((a, i) => isAcceptable(a, RIDDLES[i].answers))).toEqual([true, true, true])
})
test('synonyms are accepted', () => {
	expect(['Perspective', 'a premonition', 'Remembrance'].map((a, i) => isAcceptable(a, RIDDLES[i].answers))).toEqual([true, true, true])
})
test('an earlier answer does not solve a later riddle', () => expect(isAcceptable('perception', RIDDLES[2].answers)).toBe(false))

test('normalizeAnswer drops one leading article and collapses space', () => {
	expect(normalizeAnswer('An   Old\tFriend')).toBe('old friend')
	expect(normalizeAnswer('the the')).toBe('the')
})
test('editDistance', () => {
	expect(editDistance('kitten', 'sitting')).toBe(3)
	expect(editDistance('', 'abc')).toBe(3)
})
test('allowedTypos thresholds', () => {
	expect([allowedTypos('moon'), allowedTypos('shadow'), allowedTypos('remembrance')]).toEqual([0, 1, 2])
})
test('isMemoryState', () => {
	expect(isMemoryState({ index: 0 })).toBe(true)
	expect(isMemoryState({ index: RIDDLES.length })).toBe(true)
	expect(isMemoryState({ index: RIDDLES.length + 1 })).toBe(false)
	expect(isMemoryState({ index: -1 })).toBe(false)
	expect(isMemoryState({ index: 1.5 })).toBe(false)
	expect(isMemoryState(null)).toBe(false)
})

test('GM keys are swallowed while a text input is focused', () => {
	const input = document.createElement('input')
	document.body.append(input)
	input.focus()
	const advance = vi.fn()
	const reset = vi.fn()
	const off = gmKeys({ advance, reset })
	for (const code of ['KeyN', 'KeyR']) {
		const e = new KeyboardEvent('keydown', { code, altKey: true, shiftKey: true, bubbles: true, cancelable: true })
		input.dispatchEvent(e)
		expect(e.defaultPrevented).toBe(true)
	}
	expect(advance).toHaveBeenCalledTimes(1)
	expect(reset).toHaveBeenCalledTimes(1)
	off()
	input.remove()
})
