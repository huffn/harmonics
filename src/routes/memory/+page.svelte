<script lang="ts">
	import { onMount } from 'svelte'
	import { gmKeys } from '#lib/shared/gm-keys'
	import { clearSession, loadSession, saveSession } from '#lib/shared/session'
	import { isAcceptable, isMemoryState, type MemoryState } from '#lib/memory/match'
	import { RIDDLES, SOLVED_TEXT } from '#lib/memory/riddles'

	const KEY = 'puzzle:memory'
	const TOTAL = RIDDLES.length

	let game = $state<MemoryState>({ index: 0 })
	let loaded = $state(false)
	let input = $state('')
	let miss = $state(false)
	let missTimer: ReturnType<typeof setTimeout> | undefined

	const solved = $derived(game.index >= TOTAL)

	function clearMiss() {
		clearTimeout(missTimer)
		miss = false
	}

	function submit(e: SubmitEvent) {
		e.preventDefault()
		if (solved || !input.trim()) return
		if (isAcceptable(input, RIDDLES[game.index].answers)) {
			game = { index: game.index + 1 }
			input = ''
			clearMiss()
		} else {
			miss = true
			clearTimeout(missTimer)
			missTimer = setTimeout(() => (miss = false), 2000)
		}
	}

	onMount(() => {
		// Page CSS is scoped to html.memory so it cannot leak into other routes.
		document.documentElement.classList.add('memory')
		game = loadSession(KEY, isMemoryState) ?? { index: 0 }
		loaded = true
		const removeKeys = gmKeys({
			advance: () => {
				game = { index: Math.min(game.index + 1, TOTAL) }
				input = ''
				clearMiss()
			},
			reset: () => {
				clearSession(KEY)
				game = { index: 0 }
				input = ''
				clearMiss()
			}
		})
		return () => {
			removeKeys()
			clearTimeout(missTimer)
			document.documentElement.classList.remove('memory')
		}
	})

	// Save after every change (but never before the saved state has been read).
	$effect(() => {
		if (loaded) saveSession(KEY, $state.snapshot(game))
	})
</script>

<svelte:head>
	<title>Memory</title>
</svelte:head>

<main class="container">
	<h1>MEMORY</h1>
	{#if solved}
		<p class="finish">{SOLVED_TEXT}</p>
	{:else}
		<div class="count">Riddle {game.index + 1} of {TOTAL}</div>
		<p class="prompt">{RIDDLES[game.index].prompt}</p>
		<form onsubmit={submit}>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="text"
				bind:value={input}
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
				aria-label="Your answer"
				autofocus
			/>
			<button type="submit">SUBMIT</button>
		</form>
		<div class="message" role="status">{miss ? 'Not quite.' : ''}</div>
	{/if}
</main>

<style>
	:global(html.memory) {
		--bg-color: #111520;
		--text-color: #f8fafc;
		--text-muted: #94a3b8;
		--box-bg: #1e2536;
		--border-color: #334155;
		--accent: #8ab4f8;
	}
	:global(html.memory body) {
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		text-align: center;
		background: var(--bg-color);
		color: var(--text-color);
		padding: 20px;
		display: flex;
		justify-content: center;
		min-height: 100vh;
	}
	.container {
		width: 100%;
		max-width: 550px;
		display: flex;
		flex-direction: column;
	}
	h1 {
		margin: 0 0 20px;
		font-size: 18px;
		letter-spacing: 3px;
	}
	.count {
		color: var(--text-muted);
		font-size: 14px;
		letter-spacing: 2px;
		text-transform: uppercase;
	}
	.prompt {
		background: var(--box-bg);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 20px;
		font-size: 20px;
		line-height: 1.5;
		margin: 15px 0 20px;
		white-space: pre-line;
	}
	form {
		display: flex;
		gap: 10px;
	}
	input {
		flex: 1;
		min-width: 0;
		font-size: 20px;
		padding: 10px 14px;
		background: transparent;
		color: var(--text-color);
		border: 2px solid var(--border-color);
		border-radius: 6px;
		outline: none;
		transition: border-color 0.2s;
	}
	input:focus {
		border-color: var(--accent);
	}
	button {
		background: var(--accent);
		color: var(--bg-color);
		font-weight: bold;
		font-size: 16px;
		border: none;
		padding: 12px 24px;
		border-radius: 6px;
		cursor: pointer;
	}
	.message {
		height: 24px;
		margin-top: 12px;
		font-weight: bold;
		color: #ff5a00;
	}
	.finish {
		font-size: 28px;
		font-weight: bold;
		color: var(--accent);
		margin-top: 40px;
		animation: memory-fade 1s ease-out;
	}
	@keyframes -global-memory-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
