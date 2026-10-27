<script lang="ts">
	import { SITE_TITLE, SITE_FLAVOR } from '#lib/site'
</script>

<svelte:head>
	<title>{SITE_TITLE}</title>
</svelte:head>

<main>
	<h1>{SITE_TITLE}</h1>
	<p>{SITE_FLAVOR}</p>
</main>

<style>
	:global(body) {
		background: #07060d;
		color: #d9d2c0;
		font-family: Georgia, 'Times New Roman', serif;
	}
	main {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 2rem;
		background:
			radial-gradient(ellipse at 50% 35%, #2a1f4a 0%, transparent 60%),
			radial-gradient(ellipse at 50% 100%, #1a0f1f 0%, transparent 70%), #07060d;
	}
	h1 {
		font-size: clamp(2.5rem, 8vw, 5rem);
		font-weight: normal;
		letter-spacing: 0.15em;
		margin: 0 0 1.5rem;
		text-shadow: 0 0 24px #7a5cff88;
	}
	p {
		max-width: 40rem;
		white-space: pre-line;
		line-height: 1.8;
		font-style: italic;
		opacity: 0.8;
		margin: 0;
	}
</style>
