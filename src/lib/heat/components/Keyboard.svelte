<script lang="ts">
	import { alphabet } from '#lib/heat/logic';
	import type { HeatGame } from '../game.svelte';

	let { game, disabled = false }: { game: HeatGame; disabled?: boolean } = $props();

	// The default (alphabetic) layout; the Enter and Backspace keys sit on row 2.
	const layout = [
		['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
		['k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't'],
		['u', 'v', 'w', 'x', 'y', 'z']
	];
	const wideKeysRow = 2;

	function handleKeydown({ key, altKey, ctrlKey, metaKey, target, repeat }: KeyboardEvent) {
		// Modified keys are never typing (and keep the GM shortcuts from typing letters).
		if (altKey || ctrlKey || metaKey || repeat || disabled) return;
		if (key === 'Backspace') game.undoLetter();
		if (key === 'Delete') game.undoLetter(false);
		if (key === 'Enter') {
			if (target instanceof HTMLButtonElement) {
				// Allow enter to activate button, then remove focus
				setTimeout(() => target.blur());
			} else {
				game.submitRow();
			}
		}
		if (key === 'ArrowLeft') game.moveCaret(-1);
		if (key === 'ArrowRight') game.moveCaret(1);
		key = key.toLowerCase();
		if (alphabet.includes(key) || key === ' ') game.typeLetter(key.trim());
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="keyboard">
	{#each layout as keyRow, r}
		<div class="key-row">
			{#if r === wideKeysRow}
				<button onclick={game.submitRow} class="wide">Enter</button>
			{/if}
			{#each keyRow as key}
				<button
					onclick={() => game.typeLetter(key)}
					class:correct={game.validLetters.size === 1 && game.validLetters.has(key)}
					class:invalid={!game.validLetters.has(key)}>{key}</button
				>
			{/each}
			{#if r === wideKeysRow}
				<button onclick={() => game.undoLetter()} class="wide" aria-label="Backspace">
					<svg viewBox="0 0 21 11" xmlns="http://www.w3.org/2000/svg" width="42" height="22">
						<line x1="7" x2="21" y1="5" y2="5" />
						<polygon points="3,5 7,2 7,8" />
						<line x1="1" x2="1" y1="0.5" y2="9.5" />
					</svg>
				</button>
			{/if}
		</div>
	{/each}
</div>

<style>
	.keyboard {
		user-select: none;
		padding: 0 4px;
		touch-action: manipulation;
		height: 100%;
	}

	.key-row {
		display: flex;
		justify-content: center;
		padding: 2px 0;
		box-sizing: border-box;
		height: calc(100% / 3);
	}
	.key-row button {
		display: flex;
		justify-content: center;
		align-items: center;
		text-transform: uppercase;
		padding: 0;
		--key-margin: 0.125rem;
		margin: 0 var(--key-margin);
		width: calc((100% - var(--key-margin) * 20) / 10);
		height: 100%;
		border-radius: 0.25rem;
		border: 0;
		font-weight: 700;
		font-size: 1.4em;
		color: #fff;
	}

	.key-row button.correct {
		background: var(--correct-color);
	}

	.key-row button.invalid {
		border: 3px solid var(--secondary-color);
		background: none;
		color: #ccc8;
	}

	.key-row button.wide {
		flex-grow: 1;
		text-transform: none;
		font-size: 1em;
	}

	.key-row button.wide svg {
		max-width: 2.4em;
		stroke-width: 2;
		stroke: #fff;
		fill: #fff;
	}

	@media (max-width: 640px) {
		.key-row button {
			font-size: 1.4em;
		}
	}
	@media (max-width: 480px) {
		.key-row button {
			font-size: 1.3em;
		}

		.key-row button.wide {
			font-size: 0.9em;
		}

		.key-row button.wide svg {
			max-width: 2em;
		}
	}
	@media (max-width: 350px) {
		.key-row button.wide {
			font-size: 0.75em;
		}
	}
</style>
