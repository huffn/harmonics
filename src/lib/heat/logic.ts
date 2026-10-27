// Temperature Calibration Control: pure game logic, ported from the Word Peaks fork in hot-cold.
import targets from './targets.json';

export const ROWS = 6;
export const WORD_LENGTH = 6;
export const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');

export type Tile = {
	id: number;
	letter: string;
	scored: boolean;
	distance: number;
	polarity: -1 | 0 | 1;
	letterBounds?: [string, string];
};
export type Board = Tile[][];

export const TARGET_WORDS: readonly string[] = targets;

let dictionary: string[] | undefined;
export async function isValidWord(word: string): Promise<boolean> {
	if (!dictionary) dictionary = (await import('./dictionary.json')).default;
	return dictionary.includes(word);
}

export function scoreTile(letter: string, answer: string, tile: number): Tile {
	const distance = alphabet.indexOf(letter) - alphabet.indexOf(answer[tile]);
	const polarity = distance === 0 ? 0 : distance > 0 ? 1 : -1;
	return { id: tile, scored: true, distance, polarity, letter };
}

export function getValidLetters(boardContent: Board, row: number, tile: number): Set<string> {
	if (tile === WORD_LENGTH) return new Set();
	const valid: Set<string> = new Set(alphabet);
	alphabet.forEach((letter) => {
		if (!valid.has(letter)) return; // Already removed
		for (let i = 0; i < row; i++) {
			const prevTile = boardContent[i][tile];
			if (prevTile.distance === 0 && letter !== prevTile.letter) valid.delete(letter);
			if (prevTile.distance < 0 && letter <= prevTile.letter) valid.delete(letter);
			if (prevTile.distance > 0 && letter >= prevTile.letter) valid.delete(letter);
		}
	});
	return valid;
}

export function getBoardRowString(row: Tile[]): string {
	return row.map((t) => t.letter).join('');
}

export function getValidLetterBounds(list: Set<string>): [string, string] {
	return [
		alphabet.find((letter) => list.has(letter))!,
		[...alphabet].reverse().find((letter) => list.has(letter))!
	];
}

export function hasEnoughLetters(boardContent: Board, row: number): boolean {
	const letters = getBoardRowString(boardContent[row]);
	return !(letters.length < WORD_LENGTH || letters.includes(' '));
}

/** Random word, never `previous` (when there is any other choice). */
export function pickWord(
	previous: string | null,
	words: readonly string[],
	rand: () => number = Math.random
): string {
	const pool = words.length > 1 ? words.filter((w) => w !== previous) : words;
	return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}

export type Round = 1 | 2 | 3;
export const nextRound = (r: Round): Round => (r === 3 ? 1 : ((r + 1) as Round));

export type HeatState = { answer: string; guesses: string[]; round: Round };

export function isHeatState(v: unknown): v is HeatState {
	if (typeof v !== 'object' || v === null) return false;
	const s = v as Record<string, unknown>;
	return (
		typeof s.answer === 'string' &&
		Array.isArray(s.guesses) &&
		s.guesses.every((g) => typeof g === 'string') &&
		(s.round === 1 || s.round === 2 || s.round === 3)
	);
}

export function initialHeatState(rand: () => number = Math.random): HeatState {
	return { answer: pickWord(null, TARGET_WORDS, rand), guesses: [], round: 1 };
}

export function isFinished(s: HeatState): boolean {
	return s.guesses.includes(s.answer) || s.guesses.length >= ROWS;
}

export function endText(s: HeatState): { status: string; button: string } {
	return s.round < 3
		? { status: `${s.round} of 3 Completed`, button: 'Next Sequence' }
		: { status: 'Temperature has been calibrated', button: 'Begin New Calibration' };
}

export function nextSequence(s: HeatState, rand: () => number = Math.random): HeatState {
	return { answer: pickWord(s.answer, TARGET_WORDS, rand), guesses: [], round: nextRound(s.round) };
}

export function rerollWord(s: HeatState, rand: () => number = Math.random): HeatState {
	return { answer: pickWord(s.answer, TARGET_WORDS, rand), guesses: [], round: s.round };
}

export function forceWin(s: HeatState): HeatState {
	return isFinished(s) ? s : { ...s, guesses: [...s.guesses, s.answer] };
}
