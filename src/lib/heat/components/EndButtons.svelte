<script lang="ts">
	import { untrack } from 'svelte';
	import { endText, type HeatState } from '#lib/heat/logic';

	let { state, onnext }: { state: HeatState; onnext: () => void } = $props();

	// Read once, like the original: the text must not change while this fades out.
	const text = untrack(() => endText(state));
</script>

<div class="container">
	<div class="actions">
		<div class="action-items">
			<div class="countdown">
				<h3>{text.status}</h3>
			</div>
			<button class="play-button" onclick={onnext}>{text.button}</button>
		</div>
	</div>
</div>

<style>
	.container {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		height: 100%;
		padding: 0.5rem;
		box-sizing: border-box;
	}

	.actions {
		width: calc(var(--board-width) - 0.5rem);
		height: 100%;
		padding: 1rem;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-radius: 0.75rem;
		background: var(--secondary-color);
	}

	.action-items {
		width: 100%;
		height: 100%;
		display: grid;
		grid-template-rows: 1fr 1fr;
		gap: 0.5rem;
	}

	.play-button {
		background: #04883b;
	}
	.play-button:hover {
		background: var(--correct-color);
	}

	.countdown {
		display: flex;
		flex-direction: column;
		justify-content: center;
		text-align: center;
	}

	.countdown h3 {
		font-size: 1.25em;
		margin: 0 0 0.3rem;
	}

	button {
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: 6px;
		border: 0;
		padding: 0;
		font-size: 1.5em;
		font-weight: 700;
		background: var(--cta-color);
	}

	button:hover {
		background: #3388de;
	}

	@media (max-width: 430px) {
		button {
			font-size: 1.25em;
		}
		.actions {
			padding: 0.5rem;
		}
	}

	@media (max-width: 340px) {
		.actions {
			width: 100%;
		}
	}
</style>
