<script lang="ts">
	import { onMount } from 'svelte'
	import { gmKeys } from '#lib/shared/gm-keys'
	import { clearSession, loadSession, saveSession } from '#lib/shared/session'
	import WaveChart from '#lib/rhythm/WaveChart.svelte'
	import {
		MAX_ATTEMPTS,
		ROUNDS,
		TARGETS,
		acceptsTyping,
		applyGuess,
		forceWin,
		initialState,
		isRhythmState,
		nextRound,
		wordToWave,
		type RhythmState
	} from '#lib/rhythm/logic'
	import '../../lib/rhythm/rhythm.css'

	const KEY = 'puzzle:rhythm'
	const LAYOUT = [
		['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
		['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
		['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL']
	]

	let game = $state<RhythmState>(initialState())
	let loaded = $state(false)
	let letters = $state<string[]>(['', '', '', '', ''])
	let hidden = $state<number[]>([])
	let scrollBox: HTMLElement

	// Final chart shows the target once the round has ended.
	const target = $derived(game.active ? null : wordToWave(TARGETS[game.position]))
	const attempts = $derived(game.history.length)

	function handleKey(key: string) {
		if (!game.active) return
		if (key === 'ENTER') {
			const before = game
			game = applyGuess(game, letters.join(''))
			if (game.history.length !== before.history.length) letters = ['', '', '', '', '']
		} else if (key === 'DEL') {
			const i = letters.findLastIndex((l) => l !== '')
			if (i >= 0) letters[i] = ''
		} else {
			const i = letters.indexOf('')
			if (i >= 0) letters[i] = key
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (!acceptsTyping(e)) return
		const key = e.key.toUpperCase()
		if (key === 'ENTER') handleKey('ENTER')
		else if (key === 'BACKSPACE') handleKey('DEL')
		else if (/^[A-Z]$/.test(key)) handleKey(key)
	}

	function proceed() {
		game = nextRound(game)
		letters = ['', '', '', '', '']
		hidden = []
	}

	function toggleHidden(i: number) {
		hidden = hidden.includes(i) ? hidden.filter((h) => h !== i) : [...hidden, i]
	}

	onMount(() => {
		// rhythm.css is scoped to html.rhythm so it cannot leak into other routes.
		document.documentElement.classList.add('rhythm')
		game = loadSession(KEY, isRhythmState) ?? initialState()
		loaded = true
		const removeKeys = gmKeys({
			advance: () => (game = forceWin(game)),
			reset: () => {
				clearSession(KEY)
				game = initialState()
				letters = ['', '', '', '', '']
				hidden = []
			}
		})
		return () => {
			removeKeys()
			document.documentElement.classList.remove('rhythm')
		}
	})

	// Save after every change (but never before the saved state has been read).
	$effect(() => {
		if (loaded) saveSession(KEY, $state.snapshot(game))
	})

	// Errors are transient in the original (cleared after 3s); end-of-round messages stay.
	$effect(() => {
		const m = game.message
		if (!m || !game.active) return
		const t = setTimeout(() => {
			if (game.message === m) game = { ...game, message: null }
		}, 3000)
		return () => clearTimeout(t)
	})

	// Center the 1-26 alphabet in the scroll window at the start of each round.
	$effect(() => {
		void game.position
		void loaded
		if (game.history.length === 0 && scrollBox) {
			scrollBox.scrollTop = (scrollBox.scrollHeight - scrollBox.clientHeight) / 2
		}
	})
</script>

<svelte:head>
	<title>Waveform Synchronization Calibration</title>
</svelte:head>

<svelte:window onkeydown={onKeydown} />

<div class="container">
	<header>
		<h1>WAVEFORM SYNCHRONIZATION CALIBRATION <span>{game.gamesWon} OF {ROUNDS}</span></h1>
	</header>

	<div class="chart-scroll-box" bind:this={scrollBox}>
		<div class="chart-container">
			<WaveChart history={game.history} {hidden} {target} />
		</div>
	</div>

	<div class="dots">
		{#each { length: MAX_ATTEMPTS } as _, i}
			<div class="dot" class:active={i === attempts} class:used={i < attempts}></div>
		{/each}
	</div>

	<div class="input-row">
		{#each letters as letter}
			<input type="text" class="letter-box" maxlength="1" readonly value={letter} />
		{/each}
	</div>

	<div class="message" style:color={game.message?.color}>{game.message?.text ?? ''}</div>

	{#if !game.active}
		<div class="btn-row">
			<button class="action-btn" onclick={proceed}>
				<span>{game.gamesWon < ROUNDS ? 'PROCEED' : 'REINITIALIZE CALIBRATION'}</span>
			</button>
		</div>
	{/if}

	<div class="history">
		{#each [...game.history].map((r, i) => ({ r, i })).reverse() as { r, i } (i)}
			<div class="guess-row">
				<span class="num">{i + 1}</span>
				<span class="word">{r.word}</span>
				<button
					class="mini-chart-container"
					class:hidden={hidden.includes(i)}
					title="Click to hide/show on main graph"
					onclick={() => toggleHidden(i)}
				>
					<WaveChart mini result={r} />
				</button>
				<span class="pct">{r.similarity}%</span>
			</div>
		{/each}
	</div>

	{#if game.active}
		<div class="keyboard">
			{#each LAYOUT as row}
				<div class="key-row">
					{#each row as key}
						<button class="key" class:wide={key === 'ENTER' || key === 'DEL'} onclick={() => handleKey(key)}>
							{key}
						</button>
					{/each}
				</div>
			{/each}
		</div>
	{/if}
</div>
