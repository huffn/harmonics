// Temperature Calibration Control: the live game (typing, caret, submit) as a runes class.
// Ported from hot-cold/src/lib/board.ts and the game-state store; rules live in logic.ts.
import { clearSession, loadSession, saveSession } from '#lib/shared/session';
import {
	ROWS,
	WORD_LENGTH,
	forceWin,
	getBoardRowString,
	getValidLetterBounds,
	getValidLetters,
	hasEnoughLetters,
	initialHeatState,
	isFinished,
	isHeatState,
	isValidWord,
	nextSequence,
	rerollWord,
	scoreTile,
	type Board,
	type HeatState,
	type Tile
} from '#lib/heat/logic';
import { Toasts } from '../shared/toasts.svelte';

export const SESSION_KEY = 'puzzle:heat';

// English strings from hot-cold/src/lib/translations/en/main.json.
export const MESSAGES = {
	notEnoughLetters: 'Not enough letters',
	invalidWord: 'Not a valid word',
	needReload: 'Update needed, please reload the page',
	answerRandomized: 'Answer randomized!'
} as const;

const ERROR_BACKGROUND = 'var(--error-color)';
const CTA_BACKGROUND = 'var(--cta-color)';
/** Wait for the row's tiles to flip before swapping the keyboard for the end buttons. */
export const END_VIEW_DELAY = 6 * 150 + 250;

const emptyRow = (): string[] => Array<string>(WORD_LENGTH).fill('');

/** Scored guesses, then the row being typed (with its letter bounds after the first row). */
export function buildBoard(s: HeatState, typed: readonly string[]): Board {
	const board: Board = [];
	for (let r = 0; r < ROWS; r++) {
		const row: Tile[] = [];
		for (let t = 0; t < WORD_LENGTH; t++) {
			row.push({ id: t, letter: '', scored: false, distance: 0, polarity: 0 });
		}
		board.push(row);
	}
	for (let r = 0; r < Math.min(s.guesses.length, ROWS); r++) {
		board[r] = [...s.guesses[r]].map((letter, t) => scoreTile(letter, s.answer, t));
	}
	const r = s.guesses.length;
	if (r < ROWS) {
		board[r].forEach((tile, t) => {
			if (r > 0) tile.letterBounds = getValidLetterBounds(getValidLetters(board, r, t));
			const letter = typed[t] ?? '';
			tile.letter = letter;
			// Typed letters outside the possible range are tinted (the "pre" polarity).
			if (letter && tile.letterBounds) {
				const [lower, upper] = tile.letterBounds;
				tile.polarity = letter < lower ? -1 : letter > upper ? 1 : 0;
			}
		});
	}
	return board;
}

export class HeatGame {
	#state = $state.raw<HeatState>(initialHeatState());
	/** Letters of the row being typed; '' is an empty tile. Not persisted. */
	typed = $state<string[]>(emptyRow());
	/** Index of the current tile in the row being typed (WORD_LENGTH = past the end). */
	caret = $state(0);
	invalidWord = $state(false);
	invalidWordPreview = $state(false);
	notEnoughLetters = $state(false);
	/** True once the end buttons should replace the keyboard. */
	showEndView = $state(false);
	/** Bumped whenever a new word starts, so tiles remount even if the word repeats. */
	gameId = $state(0);
	readonly toasts = new Toasts(2000);

	board = $derived(buildBoard(this.#state, this.typed));
	row = $derived(this.#state.guesses.length);
	finished = $derived(isFinished(this.#state));
	validLetters = $derived(
		this.finished ? new Set<string>() : getValidLetters(this.board, this.row, this.caret)
	);

	#submitting = false;
	#endViewTimer: ReturnType<typeof setTimeout> | undefined;

	constructor() {
		this.state = loadSession(SESSION_KEY, isHeatState) ?? initialHeatState();
		this.showEndView = this.finished;
	}

	get state(): HeatState {
		return this.#state;
	}

	/** Every state change is saved to the session. */
	set state(s: HeatState) {
		this.#state = s;
		saveSession(SESSION_KEY, s);
	}

	typeLetter = async (letter: string): Promise<void> => {
		if (this.finished) return;
		// Warm the dictionary so submitting is instant.
		isValidWord('').catch(() => this.#error(MESSAGES.needReload, undefined, 8000));
		if (this.caret === WORD_LENGTH) return;
		this.typed[this.caret] = letter;
		this.notEnoughLetters = false;
		this.invalidWordPreview = false;
		if (letter || this.caret < WORD_LENGTH - 1) {
			this.caret++;
			const typedWord = this.typed.join('');
			if (typedWord.length === WORD_LENGTH && typedWord !== this.#state.answer) {
				const valid = await isValidWord(typedWord).catch(() => true);
				if (!valid && this.typed.join('') === typedWord) this.invalidWordPreview = true;
			}
		}
	};

	/** Backspace clears the current tile, or the previous one if this one is empty; Delete never moves. */
	undoLetter = (moveCaretBack = true): void => {
		if (this.finished) return;
		if (moveCaretBack && this.caret > 0 && !this.typed[this.caret]) this.caret--;
		if (this.caret < WORD_LENGTH) this.typed[this.caret] = '';
		this.notEnoughLetters = false;
		this.invalidWord = false;
		this.invalidWordPreview = false;
	};

	moveCaret = (dir: number): void => {
		if (this.finished) return;
		const moveTo = this.caret + dir;
		if (moveTo < 0 || moveTo >= WORD_LENGTH) return;
		this.caret = moveTo;
	};

	/** Clicking a tile in the row being typed moves the caret there. */
	selectTile = (t: number): void => {
		if (!this.finished && t >= 0 && t < WORD_LENGTH) this.caret = t;
	};

	submitRow = async (): Promise<void> => {
		if (this.#submitting || this.finished) return;
		this.#submitting = true;
		try {
			const before = this.#state;
			if (!hasEnoughLetters(this.board, this.row)) {
				this.#error(MESSAGES.notEnoughLetters, () => (this.notEnoughLetters = false));
				this.notEnoughLetters = true;
				return;
			}
			const word = getBoardRowString(this.board[this.row]);
			let valid: boolean;
			try {
				valid = await isValidWord(word);
			} catch {
				this.#error(MESSAGES.needReload, undefined, 8000);
				return;
			}
			if (this.#state !== before) return; // GM reset or advanced while we waited
			if (word !== before.answer && !valid) {
				// Toast first: popping the previous error toast runs its flag-clearing callback.
				this.#error(MESSAGES.invalidWord, () => (this.invalidWord = false));
				this.invalidWord = true;
				this.invalidWordPreview = true;
				return;
			}
			this.state = { ...before, guesses: [...before.guesses, word] };
			this.typed = emptyRow();
			if (this.finished) this.#scheduleEndView();
			else this.caret = 0;
		} finally {
			this.#submitting = false;
		}
	};

	/** End button: next word, next round (3 → 1). */
	nextSequence = (): void => this.#startNew(nextSequence(this.#state));

	/** Header "+": new word, same round; toasts only if a word was in progress. */
	rerollWord = (): void => {
		const inProgress = !this.finished;
		this.#startNew(rerollWord(this.#state));
		if (inProgress) this.toasts.push(MESSAGES.answerRandomized, { background: CTA_BACKGROUND });
	};

	/** GM advance: the current word counts as solved. */
	advance = (): void => {
		if (this.finished) return;
		this.state = forceWin(this.#state);
		this.typed = emptyRow();
		this.#clearGuessFlags();
		this.#scheduleEndView();
	};

	/** GM reset: round 1, fresh word, empty board. */
	reset = (): void => {
		clearSession(SESSION_KEY);
		this.#startNew(initialHeatState());
	};

	destroy(): void {
		clearTimeout(this.#endViewTimer);
		this.toasts.clear();
	}

	#startNew(s: HeatState): void {
		clearTimeout(this.#endViewTimer);
		this.gameId++;
		this.state = s;
		this.typed = emptyRow();
		this.toasts.pop();
		this.caret = 0;
		this.#clearGuessFlags();
		this.showEndView = this.finished;
	}

	#clearGuessFlags(): void {
		this.invalidWord = false;
		this.invalidWordPreview = false;
		this.notEnoughLetters = false;
	}

	#scheduleEndView(): void {
		clearTimeout(this.#endViewTimer);
		this.#endViewTimer = setTimeout(() => (this.showEndView = true), END_VIEW_DELAY);
	}

	#error(msg: string, onpop?: () => void, duration?: number): void {
		this.toasts.pop();
		this.toasts.push(msg, { background: ERROR_BACKGROUND, onpop, duration });
	}
}
