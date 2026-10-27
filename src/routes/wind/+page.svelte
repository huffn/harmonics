<script lang="ts">
	import { onMount } from 'svelte'
	import { gmKeys } from '#lib/shared/gm-keys'
	import { clearSession, loadSession, saveSession } from '#lib/shared/session'
	import {
		continueAfterWin,
		forceWin,
		initialWindState,
		isWindState,
		shiftColumn,
		startLevel,
		type LevelId,
		type WindState
	} from '#lib/wind/logic'
	import { WORD_GROW_S } from '#lib/wind/geometry'
	import Title from '#lib/wind/components/Title.svelte'
	import LevelMenu from '#lib/wind/components/LevelMenu.svelte'
	import Game from '#lib/wind/components/Game.svelte'
	import WordsList from '#lib/wind/components/WordsList.svelte'
	import '../../lib/wind/wind.css'

	const KEY = 'puzzle:wind'

	let game = $state.raw<WindState>(initialWindState())
	let loaded = $state(false)
	/** The selected letters grow briefly whenever a new word (goal or additional) is found. */
	let grow = $state(false)
	let growTimer: ReturnType<typeof setTimeout> | undefined

	function shift(col: number, to: number) {
		const before = game
		game = shiftColumn(game, col, to)
		if (game.found !== before.found || game.extraFound !== before.extraFound) {
			grow = true
			clearTimeout(growTimer)
			growTimer = setTimeout(() => (grow = false), WORD_GROW_S * 1000)
		}
	}

	onMount(() => {
		// wind.css is scoped to html.wind so it cannot leak into other routes.
		document.documentElement.classList.add('wind')
		game = loadSession(KEY, isWindState) ?? initialWindState()
		loaded = true
		const removeKeys = gmKeys({
			advance: () => (game = forceWin(game)),
			reset: () => {
				clearSession(KEY)
				game = initialWindState()
			}
		})
		return () => {
			removeKeys()
			clearTimeout(growTimer)
			document.documentElement.classList.remove('wind')
		}
	})

	// Save after every change (but never before the saved state has been read).
	$effect(() => {
		if (loaded) saveSession(KEY, game)
	})
</script>

<svelte:head>
	<title>Wind Harmonic Calibration System</title>
</svelte:head>

<Title />
<div class="game-container">
	{#if game.level === null}
		<LevelMenu gamesWon={game.gamesWon} onstart={(id: LevelId) => (game = startLevel(game, id))} />
	{:else}
		<Game
			level={game.level}
			positions={game.positions}
			won={game.won}
			gamesWon={game.gamesWon.length}
			{grow}
			onshift={shift}
			oncontinue={() => (game = continueAfterWin(game))}
		/>
		<WordsList found={game.found} extraFound={game.extraFound} />
	{/if}
</div>

<style>
	.game-container {
		display: flex;
		flex-direction: column;
	}

	/* Stylings for desktops */
	@media screen and (min-width: 600px) {
		.game-container {
			flex-direction: row;
			padding: 50px;
		}

		/* The level menu and the play area both carry the original's `game` class. */
		.game-container > :global(.game) {
			width: 70%;
		}
	}
</style>
