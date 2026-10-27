<script lang="ts">
	import { LEVEL_LABELS, LEVEL_ORDER, isLevelUnlocked, type LevelId } from '#lib/wind/logic'

	type Props = { gamesWon: LevelId[]; onstart: (id: LevelId) => void }
	let { gamesWon, onstart }: Props = $props()
</script>

<div class="game difficulty-menu">
	{#each LEVEL_ORDER as id (id)}
		<button class="menu-item button" disabled={!isLevelUnlocked(id, gamesWon)} onclick={() => onstart(id)}>
			{LEVEL_LABELS[id]}
		</button>
	{/each}
</div>

<style>
	.difficulty-menu {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		margin: auto;
		gap: 15px;
	}

	.menu-item {
		display: flex;
		justify-content: center;
		align-items: center;
		border: 4px solid black;
		padding: 20px;
		width: 50%;
		font-weight: bold;
		font-size: 1.5rem;
		font-family: monospace;
		cursor: pointer;
	}

	.menu-item.button:hover {
		background-color: rgb(175, 175, 175);
	}
</style>
