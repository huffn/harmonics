<script lang="ts">
	// `onreroll` is undefined until the game has loaded; the "+" stays hidden until then.
	let { onreroll }: { onreroll?: () => void } = $props();

	function newRandomWord(event: MouseEvent & { currentTarget: HTMLButtonElement }) {
		onreroll?.();
		event.currentTarget.blur();
	}
</script>

<header>
	<div class="heading-container">
		<h1>Temperature Calibration Control</h1>
	</div>
	<div class="menu-buttons" style:visibility={onreroll ? 'visible' : 'hidden'}>
		<button title="New word" class="new-random" onclick={newRandomWord}>
			<svg viewBox="0 0 7 7" xmlns="http://www.w3.org/2000/svg" width="21px">
				<path
					stroke="currentColor"
					fill="none"
					d="M3.5 1.5 v4 M1.5 3.5 h4"
					stroke-width="1"
					stroke-linecap="round"
				/>
			</svg>
		</button>
	</div>
</header>

<style>
	header {
		transition: width 400ms ease-in-out;
		margin: 0.75rem auto 1rem;
		padding: 0 0.5rem;
		box-sizing: border-box;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.heading-container {
		display: flex;
		flex-direction: column;
		align-items: baseline;
	}

	h1 {
		margin: 0;
	}

	.menu-buttons {
		display: flex;
	}

	.menu-buttons button {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0;
		width: 45px;
		height: 45px;
		margin-left: 10px;
		border-radius: 8px;
		border: 0;
		font-weight: 700;
		font-size: 1.4em;
		color: #888;
		background-color: #ffffff0a;
		transition: background-color 120ms ease-out;
		font-family: var(--font-list);
	}

	@media (hover: hover) {
		.menu-buttons button:hover {
			color: var(--text-color);
			background-color: var(--secondary-color);
		}
	}

	@media (max-width: 390px) {
		.menu-buttons button {
			margin-left: 0.5rem;
		}
		h1 {
			font-size: 1.375em;
		}
	}
</style>
