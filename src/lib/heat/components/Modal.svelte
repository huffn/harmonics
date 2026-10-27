<script lang="ts">
	// Full-screen panel the tutorial opens in (ported from hot-cold's Screen.svelte).
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import { quadOut } from 'svelte/easing';

	let { title, onclose, children }: { title: string; onclose: () => void; children: Snippet } =
		$props();

	let backgroundElement: HTMLDivElement;
	let backgroundClickTarget: EventTarget | null = null;
	function onBackgroundMousedown(event: MouseEvent) {
		if (event.target === backgroundElement) backgroundClickTarget = event.target;
	}
	function onBackgroundMouseup(event: MouseEvent) {
		if (event.target === backgroundClickTarget) {
			event.preventDefault();
			onclose();
		}
	}
	function handleKeyDown({ key }: KeyboardEvent) {
		if (key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeyDown} />
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="background"
	bind:this={backgroundElement}
	transition:slide|global={{ easing: quadOut, duration: 250 }}
	onmousedown={onBackgroundMousedown}
	onmouseup={onBackgroundMouseup}
>
	<button title="Close" onclick={onclose}>
		<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
			<title>Close</title>
			<line x1="1" y1="1" x2="9" y2="9" />
			<line x1="9" y1="1" x2="1" y2="9" />
		</svg>
	</button>
	<div class="column">
		<section class:no-title={!title}>
			{#if title}<h2>{title}</h2>{/if}
			{@render children()}
		</section>
	</div>
</div>

<style>
	.background {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		overflow: auto;
		background: var(--secondary-color);
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;
	}

	.column {
		max-width: 580px;
		width: 100%;
		margin-top: 60px;
		display: flex;
		align-items: flex-start;
		justify-content: center;
	}

	button {
		margin: 0;
		border: 0;
		width: 100%;
		height: 60px;
		min-height: 60px;
		background-color: var(--tertiary-color);
		display: flex;
		position: fixed;
		align-items: center;
		justify-content: center;
		z-index: 999999;
	}

	svg {
		margin: 0;
		stroke-width: 1.5;
		stroke: var(--text-color);
		opacity: 0.6;
		fill: none;
	}

	button:hover svg {
		opacity: 1;
	}

	section {
		flex-grow: 1;
		position: relative;
		padding: 1rem 1.5rem 3.5rem;
		box-sizing: border-box;
	}
	section.no-title {
		padding-top: 1.4rem;
	}

	h2 {
		font-size: 1.8em;
		text-align: center;
		margin: 0.4rem 0 1.5rem;
	}
</style>
