<script lang="ts">
	// The play area, ported from windHarmonic's Game.tsx (the instructions modal is gone).
	import { LEVELS, type LevelId } from '#lib/wind/logic'
	import { LEVEL_STYLES, longestColumn } from '#lib/wind/geometry'
	import Column from '#lib/wind/components/Column.svelte'
	import WinMessage from '#lib/wind/components/WinMessage.svelte'

	type Props = {
		level: LevelId
		positions: number[]
		won: boolean
		gamesWon: number
		grow: boolean
		onshift: (col: number, to: number) => void
		oncontinue: () => void
	}
	let { level, positions, won, gamesWon, grow, onshift, oncontinue }: Props = $props()

	const box = $derived(LEVEL_STYLES[level].boxHeight)
	const letterSize = $derived(LEVEL_STYLES[level].letterSize)
	const longest = $derived(longestColumn(level))
	// Moves the columns (and the selection bar with them) down to give more play area.
	const drop = $derived(`translateY(${(longest / 3) * box}px)`)
</script>

<div class="game">
	{#if won}<WinMessage {gamesWon} {oncontinue} />{/if}
	<div class="game__columns" style:transform={drop}>
		{#each LEVELS[level].columns as column, i (i)}
			<Column
				letters={column.letters}
				position={positions[i]}
				{longest}
				{box}
				{letterSize}
				disabled={won}
				{grow}
				onshift={(to) => onshift(i, to)}
			/>
		{/each}
	</div>
	<div
		class="game__selection"
		style:bottom="{longest * box}px"
		style:height="{box}px"
		style:transform={drop}
	></div>
</div>

<style>
	.game {
		position: relative;
		display: flex;
		flex-direction: column;
		overflow-y: hidden;
		/* Keeps the selection bar's z-index: -1 inside the game instead of behind the page. */
		isolation: isolate;
	}

	.game__columns {
		position: relative;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 5px;
	}

	.game__selection {
		position: absolute;
		background-color: rgba(136, 136, 136, 0.6);
		width: 100%;
		z-index: -1;
	}
</style>
