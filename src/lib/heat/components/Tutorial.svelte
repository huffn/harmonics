<script lang="ts">
	import Tile from '#lib/heat/components/Tile.svelte';
	import Modal from '#lib/heat/components/Modal.svelte';

	let { onclose }: { onclose: () => void } = $props();
</script>

<Modal title="How to play" {onclose}>
	<p>Guess the word in 6 tries!</p>
	<p>
		After each guess, the tiles show whether your letters occur earlier or later in the alphabet
		compared to the correct letters. Earlier means closer to A, later means closer to Z.
	</p>
	<div class="row">
		<div>
			<Tile tile={{ scored: true, letter: 'p', distance: 0, id: 0, polarity: 0 }} />
		</div>
		<p>Letter is correct</p>
	</div>
	<div class="row">
		<div>
			<Tile tile={{ scored: true, letter: 'd', distance: -1, id: 0, polarity: 0 }} />
		</div>
		<p>Letter is too early in the alphabet</p>
	</div>
	<div class="row">
		<div>
			<Tile tile={{ scored: true, letter: 'w', distance: 1, id: 0, polarity: 0 }} />
		</div>
		<p>Letter is too late in the alphabet</p>
	</div>
	<hr />
	<div class="row">
		<div>
			<Tile
				tile={{
					scored: false,
					letter: '',
					distance: 0,
					id: 0,
					letterBounds: ['e', 'v'],
					polarity: 0
				}}
				current={true}
				showHint={true}
			/>
		</div>
		<p>The range of possible letters is shown on the tile and the keyboard as you type</p>
	</div>
</Modal>

<style>
	.row {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 0.9rem auto;
	}

	.row p {
		margin: 0;
	}

	hr {
		max-width: 63%;
		border: 1px solid #666;
	}
</style>
