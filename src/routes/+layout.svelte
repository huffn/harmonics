<script lang="ts">
	import type { LayoutProps } from './$types'
	let { children }: LayoutProps = $props()
</script>

{@render children()}

<style>
	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}
	:global(html, body) {
		margin: 0;
		padding: 0;
		min-height: 100%;
	}
</style>
