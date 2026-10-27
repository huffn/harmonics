<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { gmKeys } from '#lib/shared/gm-keys';
	import Toast from '#lib/shared/Toast.svelte';
	import Header from '#lib/heat/components/Header.svelte';
	import Board from '#lib/heat/components/Board.svelte';
	import Keyboard from '#lib/heat/components/Keyboard.svelte';
	import EndButtons from '#lib/heat/components/EndButtons.svelte';
	import { HeatGame } from '../../lib/heat/game.svelte';
	import '../../lib/heat/heat.css';

	// Created on mount: the saved game lives in sessionStorage, which prerendering can't see.
	let game = $state<HeatGame | null>(null);
	// No fade on first paint, as in the original Controls.svelte.
	let transitionDuration = $state(0);

	onMount(() => {
		// heat.css is scoped to html.heat so it cannot leak into other routes.
		document.documentElement.classList.add('heat');
		const g = new HeatGame();
		game = g;
		const removeKeys = gmKeys({ advance: g.advance, reset: g.reset });
		tick().then(() => (transitionDuration = 250));
		return () => {
			removeKeys();
			g.destroy();
			document.documentElement.classList.remove('heat');
		};
	});
</script>

<svelte:head>
	<title>Temperature Calibration Control</title>
</svelte:head>

<div id="main">
	{#if game}<Toast toasts={game.toasts} />{/if}
	<section>
		<Header onreroll={game?.rerollWord} />
		<Board {game} />
		<section class="controls">
			{#if game}
				{#if game.showEndView}
					<div transition:fade|global={{ duration: transitionDuration, easing: cubicOut }}>
						<EndButtons state={game.state} onnext={game.nextSequence} />
					</div>
				{:else}
					<div transition:fade|global={{ duration: transitionDuration, easing: cubicOut }}>
						<Keyboard {game} />
					</div>
				{/if}
			{/if}
		</section>
	</section>
</div>

<style>
	#main {
		max-width: 720px;
		margin: 0 auto;
	}

	.controls {
		height: 186px;
		position: relative;
	}

	.controls div {
		height: 100%;
		width: 100%;
		position: absolute;
		top: 0;
		left: 0;
	}

	@media (min-width: 721px) and (max-height: 730px) {
		.controls {
			height: 168px;
		}
	}
	@media (min-width: 721px) and (max-height: 710px) {
		.controls {
			height: 156px;
		}
	}
	@media (min-width: 721px) and (max-height: 695px) {
		.controls {
			height: 150px;
		}
	}
</style>
