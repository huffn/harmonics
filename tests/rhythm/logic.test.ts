import { describe, expect, test } from 'vitest';
import {
	DICTIONARY,
	TARGETS,
	acceptsTyping,
	applyGuess,
	calcSimilarity,
	forceWin,
	initialState,
	isRhythmState,
	nextRound,
	scoreGuess,
	wordToWave,
	type GuessResult
} from '#lib/rhythm/logic';

describe('rhythm logic', () => {
	test('wave maps A=1..Z=26', () => expect(wordToWave('PULSE')).toEqual([16, 21, 12, 19, 5]));
	test('identical waves are 100%', () =>
		expect(calcSimilarity([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])).toBe(100));
	test('max distance floors at 0', () =>
		expect(calcSimilarity([1, 1, 1, 1, 1], [26, 26, 26, 26, 26])).toBe(0));
	test('bounds are guess ± diff', () => {
		const r = scoreGuess('PHASE', 'PULSE') as GuessResult;
		expect(r.upper[1]).toBe(8 + 13);
		expect(r.lower[1]).toBe(8 - 13);
	});
	test('every target is in the dictionary', () =>
		TARGETS.forEach((t) => expect(DICTIONARY.has(t)).toBe(true)));
	test('rejects short and unknown words', () => {
		expect(scoreGuess('ABC', 'PULSE')).toEqual({ error: 'Word must be 5 letters.' });
		expect(scoreGuess('ZZZZZ', 'PULSE')).toEqual({ error: 'Not in word list!' });
	});
	test('positions cycle through all six targets', () => {
		let s = initialState();
		const seen = [TARGETS[s.position]];
		for (let i = 0; i < 6; i++) {
			s = nextRound(s);
			seen.push(TARGETS[s.position]);
		}
		expect(seen).toEqual([...TARGETS, 'PULSE']);
	});
	test('correct guess wins and counts', () => {
		const s = applyGuess(initialState(), 'PULSE');
		expect(s.won).toBe(true);
		expect(s.active).toBe(false);
		expect(s.gamesWon).toBe(1);
		expect(s.message).toEqual({ text: 'Phrase Acknowledged!', color: 'var(--accent)' });
	});
	test('third win shows the calibration message', () => {
		const s = applyGuess({ ...initialState(), gamesWon: 2 }, 'PULSE');
		expect(s.message?.text).toBe('Calibration Complete!');
	});
	test('tenth wrong guess ends the round lost with the word', () => {
		let s = initialState();
		for (let i = 0; i < 10; i++) s = applyGuess(s, 'PHASE');
		expect(s.active).toBe(false);
		expect(s.won).toBe(false);
		expect(s.history).toHaveLength(10);
		expect(s.message).toEqual({ text: 'Game Over! Word was PULSE', color: 'var(--accent-guess)' });
	});
	test('invalid guesses do not use an attempt', () => {
		let s = applyGuess(initialState(), 'ABC');
		expect(s.history).toHaveLength(0);
		expect(s.message?.text).toBe('Need 5 letters.');
		s = applyGuess(initialState(), 'ZZZZZ');
		expect(s.history).toHaveLength(0);
		expect(s.message?.text).toBe('Not in word list!');
	});
	test('guesses after the round ends are ignored', () => {
		const done = applyGuess(initialState(), 'PULSE');
		expect(applyGuess(done, 'PHASE')).toBe(done);
	});
	test('next round after the third win resets the count', () => {
		const s = nextRound({ ...initialState(), gamesWon: 3, active: false });
		expect(s.gamesWon).toBe(0);
	});
	test('next round after a loss still advances and keeps the count', () => {
		const s = nextRound({ ...initialState(), gamesWon: 1, active: false });
		expect(s.position).toBe(1);
		expect(s.gamesWon).toBe(1);
		expect(s.active).toBe(true);
		expect(s.history).toEqual([]);
		expect(s.message).toBeNull();
	});
	test('forceWin counts as a win', () => expect(forceWin(initialState()).gamesWon).toBe(1));
	test('state survives a JSON round-trip and validates', () => {
		const s = applyGuess(nextRound(initialState()), 'PULSE');
		const back = JSON.parse(JSON.stringify(s));
		expect(isRhythmState(back)).toBe(true);
		expect(back).toEqual(s);
	});
	test('rejects malformed state', () => {
		expect(isRhythmState(null)).toBe(false);
		expect(isRhythmState({ ...initialState(), position: 9 })).toBe(false);
		expect(isRhythmState({ ...initialState(), history: [{}] })).toBe(false);
	});
	test('modified keys are not typing', () => {
		expect(acceptsTyping({ altKey: true, ctrlKey: false, metaKey: false })).toBe(false);
		expect(acceptsTyping({ altKey: false, ctrlKey: false, metaKey: false })).toBe(true);
	});
});
