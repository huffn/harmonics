<script lang="ts">
	import Tile from '#lib/heat/components/Tile.svelte';
	import { ROWS } from '#lib/heat/logic';
	import type { HeatGame } from '../game.svelte';

	// `game` is null until the session has been read (client only).
	let { game }: { game: HeatGame | null } = $props();
</script>

<div class="container" style="--row-count: {ROWS}">
	{#if game}
		<div class="board">
			<div class="tile-row-container">
				{#each game.board as boardRow, r}
					<div class="tile-row">
						{#each boardRow as tile, t (game.gameId + ':' + r + '.' + t)}
							<Tile
								{tile}
								current={r === game.row && t === game.caret}
								inCurrentRow={!game.finished && r === game.row}
								showHint={!game.finished && t === game.caret}
								finished={game.finished}
								invalidWord={game.invalidWord}
								invalidWordPreview={game.invalidWordPreview}
								notEnoughLetters={game.notEnoughLetters}
								onselect={game.selectTile}
							/>
						{/each}
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="loading">loading...</div>
	{/if}
</div>

<style>
	.container {
		margin: 0 auto 6px;
		padding: 0 4px;
		height: calc(var(--row-count) * (var(--tile-size) + var(--tile-margin)));
		display: flex;
		align-items: flex-start;
		justify-content: center;
	}

	.board {
		display: flex;
		flex-direction: column;
		margin-right: 4px;
		height: 100%;
		width: var(--board-width);
		position: relative;
	}

	.tile-row-container {
		position: absolute;
		top: 0;
		left: 0;
	}

	.tile-row {
		margin-bottom: var(--tile-margin);
		display: flex;
	}

	.tile-row:last-child {
		margin-bottom: 0;
	}

	.loading {
		display: flex;
		height: 100%;
		align-items: center;
		color: #aaa;
		font-size: 1.3em;
		background: linear-gradient(to left, #aaa1, #aaa3 20%, #aaa, #aaa3 80%, #aaa1);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		animation: glimmer 3s linear infinite;
		background-size: 200%;
	}
	@keyframes glimmer {
		to {
			background-position: 200% center;
		}
	}

	@media (max-width: 375px) {
		.container {
			margin-bottom: 4px;
		}
	}
</style>
