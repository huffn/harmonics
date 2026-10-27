<script lang="ts">
	type Props = { found: string[]; extraFound: string[] }
	let { found, extraFound }: Props = $props()

	// Unfound words are dash placeholders of the same length.
	const count = (words: string[]) => words.filter((w) => !w.includes('-')).length
</script>

<div class="words_list">
	<p class="words_list__title">
		Words Found
		<br />
		{count(found)}/{found.length}
	</p>
	<ul>
		{#each found as word, i (i)}
			<li class="words_list__word">{word}</li>
		{/each}
	</ul>
	<br />
	<p class="words_list__title">
		Additional Words Found
		<br />
		{count(extraFound)}/{extraFound.length}
	</p>
	<ul>
		{#each extraFound as word, i (i)}
			<li class="words_list__word">{word}</li>
		{/each}
	</ul>
</div>

<style>
	.words_list {
		text-align: center;
		font-size: 1.4rem;
		font-family: monospace;
		padding: 25px;
		border-top: 2px solid black;
		margin: 0 15px;
		overflow-y: auto;
		height: 75vh;
	}

	.words_list__title {
		text-decoration: underline;
	}

	/* Stylings for desktops */
	@media screen and (min-width: 600px) {
		.words_list {
			border: none;
			border-left: 2px solid black;
		}
	}
</style>
