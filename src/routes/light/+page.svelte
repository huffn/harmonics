<script lang="ts">
	import { onMount } from 'svelte'
	import { gmKeys } from '#lib/shared/gm-keys'
	import { mountTable } from '#lib/light/ui'
	import '../../lib/light/light.css'

	let root: HTMLElement

	onMount(() => {
		const table = mountTable(root)
		// Advance is a no-op on light: there is a single level.
		const removeKeys = gmKeys({ reset: table.fullReset })
		return () => {
			removeKeys()
			table.destroy()
		}
	})
</script>

<svelte:head>
	<title>The Table of Light</title>
</svelte:head>

<main class="table" bind:this={root}>
	<div class="board-wrap">
		<!-- Filled with stacked layers by src/lib/light/render.ts. -->
		<div class="board-stack" id="board-stack"></div>
	</div>

	<aside class="panel">
		<header class="panel-header">
			<h1>The Table of Light</h1>
			<!-- The prism sits beside the title, unexplained, for the party to discover. -->
			<div id="prism-tray">
				<div class="token prism-token" data-piece="splitter"></div>
			</div>
		</header>

		<section class="card">
			<div class="label">Mirrors</div>
			<div class="count"><span id="mirrors-used">0</span> <span class="of">/ <span id="mirrors-available">10</span></span></div>
			<p class="hint">Click a square to set a mirror. Click it again to turn it, Shift-click or scroll to turn it back. Right-click to lift it.</p>
		</section>

		<!-- Hidden until the GM types "harmonic" (see src/lib/light/ui.ts). -->
		<section class="card harmonics-only" hidden>
			<div class="label">Harmonics</div>
			<div class="tray" id="tray">
				<div class="token" data-color="green"></div>
				<div class="token" data-color="red"></div>
				<div class="token" data-color="yellow"></div>
				<div class="token" data-color="blue"></div>
			</div>
		</section>

		<section class="card harmonics-only" hidden>
			<div class="label">Awakened</div>
			<div class="count"><span id="lit-count">0</span> <span class="of">of 4</span></div>
		</section>

		<p class="message" id="message" role="status" aria-live="polite"></p>

		<button type="button" id="reset" class="reset">Reset the table</button>
	</aside>
</main>
