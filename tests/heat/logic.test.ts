import { describe, expect, test } from 'vitest';
import {
	TARGET_WORDS,
	endText,
	forceWin,
	getValidLetters,
	initialHeatState,
	isFinished,
	isHeatState,
	isValidWord,
	nextRound,
	nextSequence,
	pickWord,
	rerollWord,
	scoreTile,
	type Board
} from '#lib/heat/logic';

describe('heat logic', () => {
	test('never repeats the previous word', () => {
		for (let i = 0; i < 200; i++) expect(pickWord('warmth', TARGET_WORDS)).not.toBe('warmth');
	});
	test('a stuck rand still avoids the previous word', () =>
		expect(pickWord(TARGET_WORDS[0], TARGET_WORDS, () => 0)).not.toBe(TARGET_WORDS[0]));
	test('targets are the five heat words', () =>
		expect([...TARGET_WORDS].sort()).toEqual(['heater', 'ignite', 'scorch', 'summer', 'warmth']));
	test('rounds cycle 1→2→3→1', () =>
		expect([nextRound(1), nextRound(2), nextRound(3)]).toEqual([2, 3, 1]));
	test('end text', () => {
		expect(endText({ answer: 'warmth', guesses: ['warmth'], round: 2 })).toEqual({
			status: '2 of 3 Completed',
			button: 'Next Sequence'
		});
		expect(endText({ answer: 'warmth', guesses: ['warmth'], round: 3 })).toEqual({
			status: 'Temperature has been calibrated',
			button: 'Begin New Calibration'
		});
	});
	test('next sequence always changes the word and clears guesses', () => {
		const s = nextSequence({ answer: 'warmth', guesses: ['warmth'], round: 1 }, () => 0);
		expect(s.answer).not.toBe('warmth');
		expect(s.guesses).toEqual([]);
		expect(s.round).toBe(2);
	});
	test('reroll keeps the round and changes the word', () => {
		const s = rerollWord({ answer: 'warmth', guesses: ['ignite'], round: 2 }, () => 0);
		expect(s.round).toBe(2);
		expect(s.answer).not.toBe('warmth');
		expect(s.guesses).toEqual([]);
	});
	test('scoreTile distance', () =>
		expect(scoreTile('a', 'warmth', 1)).toMatchObject({ distance: 0, polarity: 0 }));
	test('getValidLetters narrows to n..z after guessing m against warmth', () => {
		const board: Board = [scoreRow('mmmmmm', 'warmth')];
		// 'm' vs 'w' in tile 0: guess is below the answer, so only letters after 'm' remain.
		expect([...getValidLetters(board, 1, 0)].join('')).toBe('nopqrstuvwxyz');
	});
	test('forceWin finishes the game', () => expect(isFinished(forceWin(initialHeatState()))).toBe(true));
	test('state validates after JSON round-trip', () => {
		const s = initialHeatState();
		expect(isHeatState(JSON.parse(JSON.stringify(s)))).toBe(true);
		expect(isHeatState({ answer: 'x', guesses: [], round: 4 })).toBe(false);
	});
	test('every target is a valid word', async () => {
		for (const w of TARGET_WORDS) expect(await isValidWord(w)).toBe(true);
	});
});

function scoreRow(guess: string, answer: string) {
	return [...guess].map((l, i) => scoreTile(l, answer, i));
}
