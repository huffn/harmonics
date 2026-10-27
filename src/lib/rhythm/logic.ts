/// <reference types="vite/client" />
// Waveform Synchronization Calibration: the rules, ported from Harmonics/harmonics.js
// (server) and html_template.html (client) so the whole game runs in the browser.
import words from './words_en.txt?raw';

export const TARGETS = ['PULSE', 'PHASE', 'TEMPO', 'METER', 'CYCLE', 'RHYME'] as const;
export const MAX_ATTEMPTS = 10;
export const ROUNDS = 3;

const WIN = 'var(--accent)';
const BAD = 'var(--accent-guess)';

// Messages copied from i18n.en in html_template.html.
const MSG = {
	need: 'Need 5 letters.',
	win: 'Phrase Acknowledged!',
	win3: 'Calibration Complete!',
	over: 'Game Over! Word was '
};

export function cleanWord(w: string): string {
	return w.normalize('NFKD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

export function wordToWave(word: string): number[] {
	return word
		.toUpperCase()
		.split('')
		.map((c) => c.charCodeAt(0) - 'A'.charCodeAt(0) + 1);
}

export function calcSimilarity(target: number[], guess: number[]): number {
	if (!target || !guess) return 0;
	let total = 0;
	for (let i = 0; i < target.length; i++) total += Math.abs(target[i] - guess[i]);
	const pct = 100 - (total / 125.0) * 100;
	return Math.max(0, Math.min(100, Math.floor(pct)));
}

function buildDictionary(): ReadonlySet<string> {
	const set = new Set<string>();
	for (const line of words.split('\n')) {
		const w = cleanWord(line.trim());
		if (w.length === 5) set.add(w);
	}
	for (const t of TARGETS) set.add(t);
	return set;
}

export const DICTIONARY: ReadonlySet<string> = buildDictionary();

export type GuessResult = {
	word: string;
	wave: number[];
	upper: number[];
	lower: number[];
	similarity: number;
	isCorrect: boolean;
};

export function scoreGuess(
	guess: string,
	target: string
): GuessResult | { error: 'Word must be 5 letters.' | 'Not in word list!' } {
	const word = cleanWord(guess);
	if (word.length !== 5) return { error: 'Word must be 5 letters.' };
	if (!DICTIONARY.has(word)) return { error: 'Not in word list!' };

	const wave = wordToWave(word);
	const targetWave = wordToWave(target);
	const upper: number[] = [];
	const lower: number[] = [];
	for (let i = 0; i < wave.length; i++) {
		const diff = Math.abs(targetWave[i] - wave[i]);
		upper.push(wave[i] + diff);
		lower.push(wave[i] - diff);
	}
	const isCorrect = word === target;
	return {
		word,
		wave,
		upper,
		lower,
		similarity: isCorrect ? 100 : calcSimilarity(targetWave, wave),
		isCorrect
	};
}

export type RhythmState = {
	position: number;
	history: GuessResult[];
	active: boolean;
	won: boolean;
	gamesWon: number;
	message: { text: string; color: string } | null;
};

export function initialState(): RhythmState {
	return { position: 0, history: [], active: true, won: false, gamesWon: 0, message: null };
}

export function nextRound(s: RhythmState): RhythmState {
	return {
		position: (s.position + 1) % TARGETS.length,
		history: [],
		active: true,
		won: false,
		gamesWon: s.gamesWon >= ROUNDS ? 0 : s.gamesWon,
		message: null
	};
}

function win(s: RhythmState, history: GuessResult[]): RhythmState {
	const gamesWon = s.gamesWon + 1;
	// The original shows no message beyond the third win.
	const message =
		gamesWon < ROUNDS
			? { text: MSG.win, color: WIN }
			: gamesWon === ROUNDS
				? { text: MSG.win3, color: WIN }
				: null;
	return { ...s, history, active: false, won: true, gamesWon, message };
}

export function applyGuess(s: RhythmState, guess: string): RhythmState {
	if (!s.active || s.history.length >= MAX_ATTEMPTS) return s;
	const word = cleanWord(guess);
	if (word.length !== 5) return { ...s, message: { text: MSG.need, color: BAD } };

	const target = TARGETS[s.position];
	const r = scoreGuess(word, target);
	if ('error' in r) return { ...s, message: { text: r.error, color: BAD } };

	const history = [...s.history, r];
	if (r.isCorrect) return win(s, history);
	if (history.length >= MAX_ATTEMPTS) {
		return {
			...s,
			history,
			active: false,
			won: false,
			message: { text: MSG.over + target, color: BAD }
		};
	}
	return { ...s, history, message: null };
}

export function forceWin(s: RhythmState): RhythmState {
	return win(s, s.history);
}

const isNums = (v: unknown): v is number[] =>
	Array.isArray(v) && v.length === 5 && v.every((n) => typeof n === 'number');

function isGuessResult(v: unknown): v is GuessResult {
	if (typeof v !== 'object' || v === null) return false;
	const g = v as Record<string, unknown>;
	return (
		typeof g.word === 'string' &&
		isNums(g.wave) &&
		isNums(g.upper) &&
		isNums(g.lower) &&
		typeof g.similarity === 'number' &&
		typeof g.isCorrect === 'boolean'
	);
}

export function isRhythmState(v: unknown): v is RhythmState {
	if (typeof v !== 'object' || v === null) return false;
	const s = v as Record<string, unknown>;
	const m = s.message as Record<string, unknown> | null;
	return (
		Number.isInteger(s.position) &&
		(s.position as number) >= 0 &&
		(s.position as number) < TARGETS.length &&
		Array.isArray(s.history) &&
		s.history.length <= MAX_ATTEMPTS &&
		s.history.every(isGuessResult) &&
		typeof s.active === 'boolean' &&
		typeof s.won === 'boolean' &&
		Number.isInteger(s.gamesWon) &&
		(s.gamesWon as number) >= 0 &&
		(s.gamesWon as number) <= ROUNDS &&
		(m === null ||
			(typeof m === 'object' && typeof m.text === 'string' && typeof m.color === 'string'))
	);
}

export function acceptsTyping(e: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey'>): boolean {
	return !(e.altKey || e.ctrlKey || e.metaKey);
}
