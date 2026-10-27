<script lang="ts">
	// One draggable letter column, ported from windHarmonic's Column.tsx. Mouse and touch
	// share one Pointer Events path; the column follows the pointer freely and on release
	// snaps (0.1s) to the nearest letter, clamped to its first/last letter.
	import { onDestroy } from 'svelte'
	import {
		ARROW_WIDTH_REM,
		COLUMN_ANIMATION_S,
		WORD_GROW_S,
		offsetForPosition,
		snapPosition
	} from '#lib/wind/geometry'

	type Props = {
		letters: string[]
		position: number
		longest: number
		box: number
		letterSize: number
		disabled: boolean
		/** True while the "word found" grow plays. */
		grow: boolean
		onshift: (to: number) => void
	}
	let { letters, position, longest, box, letterSize, disabled, grow, onshift }: Props = $props()

	let drag = $state<{ pointerId: number; startY: number; startOffset: number } | null>(null)
	let dragOffset = $state(0)
	let animating = $state(false)
	let animTimer: ReturnType<typeof setTimeout> | undefined

	const restOffset = $derived(offsetForPosition(position, longest, letters.length, box))
	const offset = $derived(drag ? dragOffset : restOffset)

	function animate() {
		animating = true
		clearTimeout(animTimer)
		animTimer = setTimeout(() => (animating = false), COLUMN_ANIMATION_S * 1000)
	}
	onDestroy(() => clearTimeout(animTimer))

	function shift(to: number) {
		animate()
		if (to !== position) onshift(to)
	}

	function onpointerdown(e: PointerEvent) {
		if (disabled || drag) return
		if (e.pointerType === 'mouse' && e.button !== 0) return
		const target = e.target as Element
		if (target.closest('button')) return // the carets are buttons, not drag handles
		target.setPointerCapture(e.pointerId)
		clearTimeout(animTimer)
		animating = false
		dragOffset = offset
		drag = { pointerId: e.pointerId, startY: e.clientY, startOffset: offset }
		e.preventDefault()
	}

	function onpointermove(e: PointerEvent) {
		if (!drag || e.pointerId !== drag.pointerId) return
		dragOffset = drag.startOffset + (e.clientY - drag.startY)
	}

	function onpointerend(e: PointerEvent) {
		if (!drag || e.pointerId !== drag.pointerId) return
		const to = snapPosition(dragOffset, longest, letters.length, box)
		drag = null
		shift(to)
	}
</script>

{#snippet caret(up: boolean)}
	<svg viewBox="0 0 320 512" aria-hidden="true" style:height="{box}px" style:width="{ARROW_WIDTH_REM}rem">
		<path d={up ? 'M32 320 L160 160 L288 320 Z' : 'M32 192 L160 352 L288 192 Z'} />
	</svg>
{/snippet}

<!-- The letters are the drag handle; the caret buttons give the same moves by click/keyboard. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="column"
	class:active={drag !== null}
	style:width="{box}px"
	style:transform="translateY({offset}px)"
	style:transition={animating ? `all ${COLUMN_ANIMATION_S}s ease-in-out` : undefined}
	{onpointerdown}
	{onpointermove}
	onpointerup={onpointerend}
	onpointercancel={onpointerend}
>
	<div class="cell">
		<button
			class="caret"
			aria-label="Move column down"
			disabled={disabled || position === 0}
			onclick={() => shift(position - 1)}
		>
			{@render caret(false)}
		</button>
	</div>
	{#each letters as letter, i (i)}
		<div
			class="cell letter"
			style:height="{box}px"
			style:width="{box}px"
			style:font-size="{letterSize}rem"
			style:transform={grow && i === position ? 'scale(1.2)' : undefined}
			style:transition="transform {WORD_GROW_S}s ease-in-out"
		>
			{letter}
		</div>
	{/each}
	<div class="cell">
		<button
			class="caret"
			aria-label="Move column up"
			disabled={disabled || position === letters.length - 1}
			onclick={() => shift(position + 1)}
		>
			{@render caret(true)}
		</button>
	</div>
</div>

<style>
	.column {
		display: flex;
		flex-direction: column;
		position: relative;
		font-family: monospace;
		font-weight: bold;
		justify-content: center;
		align-items: center;
		font-size: 5rem;
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
		cursor: pointer;
		touch-action: none;
		pointer-events: none;
	}

	.cell {
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: all;
	}

	.caret {
		display: block;
		border: 0;
		padding: 0;
		background: none;
		cursor: pointer;
		color: #5dbafc;
		/* Hidden until the column is hovered or held, as in the original. */
		opacity: 0;
	}

	.caret svg {
		display: block;
		fill: currentColor;
	}

	.caret:disabled {
		cursor: default;
	}

	.column:hover .caret,
	.column.active .caret,
	.caret:focus-visible {
		opacity: 1;
	}
</style>
