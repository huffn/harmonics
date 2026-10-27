import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { isValidWord, type HeatState } from '#lib/heat/logic';
import { END_VIEW_DELAY, HeatGame, MESSAGES, SESSION_KEY, buildBoard } from '../../src/lib/heat/game.svelte';

function startWith(s: HeatState): HeatGame {
	sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
	return new HeatGame();
}

async function type(game: HeatGame, word: string) {
	for (const l of word) await game.typeLetter(l);
}

const saved = () => JSON.parse(sessionStorage.getItem(SESSION_KEY)!) as HeatState;

describe('HeatGame', () => {
	beforeAll(async () => {
		await isValidWord('warmth'); // load the dictionary once
	});
	beforeEach(() => sessionStorage.clear());
	afterEach(() => vi.useRealTimers());

	test('starts fresh, and saves, when the session is empty', () => {
		const game = new HeatGame();
		expect(game.state.round).toBe(1);
		expect(game.state.guesses).toEqual([]);
		expect(saved()).toEqual(game.state);
	});

	test('resumes the saved game', () => {
		const game = startWith({ answer: 'warmth', guesses: ['winter'], round: 2 });
		expect(game.state).toEqual({ answer: 'warmth', guesses: ['winter'], round: 2 });
		expect(game.board[0].every((t) => t.scored)).toBe(true);
		expect(game.showEndView).toBe(false);
	});

	test('a finished saved game shows the end view at once', () => {
		const game = startWith({ answer: 'warmth', guesses: ['warmth'], round: 1 });
		expect(game.showEndView).toBe(true);
	});

	test('typing fills the current row and moves the caret', async () => {
		const game = startWith({ answer: 'warmth', guesses: [], round: 1 });
		await type(game, 'win');
		expect(game.board[0].map((t) => t.letter).join('')).toBe('win');
		expect(game.caret).toBe(3);
		await type(game, 'ter');
		expect(game.caret).toBe(6);
		await game.typeLetter('x'); // row is full
		expect(game.typed.join('')).toBe('winter');
	});

	test('backspace, delete and caret moves', async () => {
		const game = startWith({ answer: 'warmth', guesses: [], round: 1 });
		await type(game, 'abc');
		game.undoLetter();
		expect(game.typed.join('')).toBe('ab');
		expect(game.caret).toBe(2);
		game.moveCaret(-1);
		game.undoLetter(false); // delete: clears in place
		expect(game.typed).toEqual(['a', '', '', '', '', '']);
		expect(game.caret).toBe(1);
		game.moveCaret(-5);
		expect(game.caret).toBe(1);
		game.selectTile(4);
		expect(game.caret).toBe(4);
	});

	test('submitting too few letters adds no guess', async () => {
		const game = startWith({ answer: 'warmth', guesses: [], round: 1 });
		await type(game, 'wint');
		await game.submitRow();
		expect(game.state.guesses).toEqual([]);
		expect(game.notEnoughLetters).toBe(true);
		expect(game.toasts.items.map((t) => t.msg)).toEqual([MESSAGES.notEnoughLetters]);
	});

	test('an invalid word adds no guess and toasts', async () => {
		const game = startWith({ answer: 'warmth', guesses: [], round: 1 });
		await type(game, 'zzzzzz');
		expect(game.invalidWordPreview).toBe(true);
		await game.submitRow();
		expect(game.state.guesses).toEqual([]);
		expect(game.invalidWord).toBe(true);
		expect(game.toasts.items.map((t) => t.msg)).toEqual([MESSAGES.invalidWord]);
	});

	test('a valid word is scored, saved and clears the row', async () => {
		const game = startWith({ answer: 'warmth', guesses: [], round: 1 });
		await type(game, 'winter');
		await game.submitRow();
		expect(game.state.guesses).toEqual(['winter']);
		expect(saved().guesses).toEqual(['winter']);
		expect(game.caret).toBe(0);
		expect(game.typed.join('')).toBe('');
		expect(game.board[0][0]).toMatchObject({ letter: 'w', scored: true, distance: 0 });
		// The next row shows the possible letter range for each column.
		expect(game.board[1][0].letterBounds).toEqual(['w', 'w']);
	});

	test('typed letters outside the range are tinted', async () => {
		const game = startWith({ answer: 'warmth', guesses: ['winter'], round: 1 });
		await game.typeLetter('a'); // column 0 must be 'w'
		expect(game.board[1][0].polarity).toBe(-1);
	});

	test('submitting the answer finishes, then shows the end view after the flip', async () => {
		const game = startWith({ answer: 'warmth', guesses: [], round: 1 });
		await type(game, 'warmth');
		vi.useFakeTimers();
		await game.submitRow();
		expect(game.finished).toBe(true);
		expect(game.showEndView).toBe(false);
		vi.advanceTimersByTime(END_VIEW_DELAY);
		expect(game.showEndView).toBe(true);
		await game.typeLetter('a'); // finished: typing does nothing
		expect(game.typed.join('')).toBe('');
	});

	test('nextSequence starts the next round with a new word', () => {
		const game = startWith({ answer: 'warmth', guesses: ['warmth'], round: 3 });
		game.nextSequence();
		expect(game.state.round).toBe(1);
		expect(game.state.answer).not.toBe('warmth');
		expect(game.state.guesses).toEqual([]);
		expect(game.showEndView).toBe(false);
	});

	test('rerollWord keeps the round and toasts only mid-word', () => {
		const game = startWith({ answer: 'warmth', guesses: ['winter'], round: 2 });
		game.rerollWord();
		expect(game.state.round).toBe(2);
		expect(game.state.answer).not.toBe('warmth');
		expect(game.state.guesses).toEqual([]);
		expect(game.toasts.items.map((t) => t.msg)).toEqual([MESSAGES.answerRandomized]);

		const done = startWith({ answer: 'warmth', guesses: ['warmth'], round: 2 });
		done.rerollWord();
		expect(done.toasts.items).toEqual([]);
	});

	test('advance solves the word without typing; reset starts over', async () => {
		const game = startWith({ answer: 'warmth', guesses: ['winter'], round: 2 });
		await type(game, 'ab');
		vi.useFakeTimers();
		game.advance();
		expect(game.state.guesses).toEqual(['winter', 'warmth']);
		expect(game.typed.join('')).toBe('');
		vi.advanceTimersByTime(END_VIEW_DELAY);
		expect(game.showEndView).toBe(true);

		game.reset();
		expect(game.state.round).toBe(1);
		expect(game.state.guesses).toEqual([]);
		expect(game.showEndView).toBe(false);
		expect(saved()).toEqual(game.state);
	});

	test('buildBoard has six rows of six tiles', () => {
		const board = buildBoard({ answer: 'warmth', guesses: [], round: 1 }, []);
		expect(board).toHaveLength(6);
		expect(board.every((r) => r.length === 6)).toBe(true);
	});
});
