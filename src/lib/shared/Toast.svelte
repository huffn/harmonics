<script lang="ts">
	// Renders a Toasts queue. Look is set with CSS variables (defaults are svelte-toast's):
	// --toast-left/--toast-right/--toast-top, --toast-width, --toast-background,
	// --toast-padding, --toast-radius.
	import { fade, fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import type { Toasts } from './toasts.svelte';

	let { toasts }: { toasts: Toasts } = $props();
</script>

<ul class="container">
	{#each toasts.items as item (item.id)}
		<li in:fly={{ y: 0 }} out:fade animate:flip={{ duration: 200 }}>
			<div class="item" role="status" style:background={item.background}>
				<div class="msg">{item.msg}</div>
				<button class="close" title="Close" onclick={() => toasts.pop(item.id)}>✕</button>
			</div>
		</li>
	{/each}
</ul>

<style>
	.container {
		position: fixed;
		top: var(--toast-top, 1.5rem);
		right: var(--toast-right, 2rem);
		left: var(--toast-left, auto);
		margin: 0;
		padding: 0;
		list-style-type: none;
		pointer-events: none;
		z-index: 9999;
	}

	.item {
		width: var(--toast-width, 16rem);
		min-height: 3.5rem;
		margin: 0 0 0.5rem 0;
		background: var(--toast-background, rgba(66, 66, 66, 0.9));
		color: #fff;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
		border-radius: var(--toast-radius, 0.125rem);
		display: flex;
		align-items: center;
		overflow: hidden;
	}

	.msg {
		padding: var(--toast-padding, 0.75rem 0.5rem);
		flex: 1 1 0%;
	}

	.close {
		pointer-events: auto;
		width: 2rem;
		align-self: stretch;
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: 1rem sans-serif;
		cursor: pointer;
	}
</style>
