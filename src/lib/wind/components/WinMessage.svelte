<script lang="ts">
	type Props = { gamesWon: number; oncontinue: () => void }
	let { gamesWon, oncontinue }: Props = $props()
</script>

<div class="game__message">
	<div>Calibration Successful</div>
	<button class="win-button" onclick={oncontinue}>
		{gamesWon < 2 ? 'Continue' : 'Calibration Complete'}
	</button>
</div>

<style>
	.game__message {
		/* Places in the middle of the game container. */
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-family: monospace;
		text-align: center;
		font-size: 2rem;
		padding: 20px 0;
		width: 40%;
		border: 3px solid black;
		border-radius: 10px;
		background-color: lightgray;
		z-index: 2;
	}

	.win-button {
		padding: 5px;
		font-weight: bold;
		font-size: 1rem;
	}
</style>
