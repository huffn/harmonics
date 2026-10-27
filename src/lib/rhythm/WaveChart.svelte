<script lang="ts">
	import Chart from 'chart.js/auto'
	import type { GuessResult } from '#lib/rhythm/logic'

	// Ports drawChart (main) and drawMiniChart (mini) from html_template.html.
	let {
		mini = false,
		history = [],
		hidden = [],
		target = null,
		result
	}: {
		mini?: boolean
		history?: GuessResult[]
		/** Indices of history rows the player has toggled off the main graph. */
		hidden?: number[]
		target?: number[] | null
		result?: GuessResult
	} = $props()

	let canvas: HTMLCanvasElement
	const labels = ['1', '2', '3', '4', '5']
	const cssVar = (name: string) => getComputedStyle(document.body).getPropertyValue(name).trim()

	// Guide lines are never shown in the original (no toggle is rendered), so
	// ticks and grid stay transparent.
	function mainChart(): Chart {
		const boundsColor = cssVar('--text-muted')
		const shadowFill = cssVar('--shadow-fill')
		const guessColor = cssVar('--accent-guess')
		const targetColor = cssVar('--accent')
		const datasets: any[] = []

		if (history.length > 0) {
			const upper = [Infinity, Infinity, Infinity, Infinity, Infinity]
			const lower = [-Infinity, -Infinity, -Infinity, -Infinity, -Infinity]
			for (const h of history) {
				for (let i = 0; i < 5; i++) {
					upper[i] = Math.min(upper[i], h.upper[i])
					lower[i] = Math.max(lower[i], h.lower[i])
				}
			}
			datasets.push({
				data: lower, borderColor: boundsColor, borderWidth: 2, borderDash: [5, 5],
				fill: false, pointRadius: 0, pointHoverRadius: 0, tension: 0.4
			})
			datasets.push({
				data: upper, borderColor: boundsColor, borderWidth: 2, borderDash: [5, 5],
				backgroundColor: shadowFill, fill: '-1', pointRadius: 0, pointHoverRadius: 0, tension: 0.4
			})
			history.forEach((h, index) => {
				if (hidden.includes(index)) return
				const isLast = index === history.length - 1
				datasets.push({
					data: h.wave,
					// '33' is hex for 20% opacity on older lines.
					borderColor: isLast ? guessColor : guessColor + '33',
					borderWidth: isLast ? 4 : 2,
					pointRadius: 0, pointHoverRadius: 0, pointBackgroundColor: guessColor, tension: 0.4
				})
			})
		}
		if (target) {
			datasets.push({
				data: target, borderColor: targetColor, borderWidth: 5,
				pointRadius: 0, pointHoverRadius: 0, pointBackgroundColor: targetColor, tension: 0.4
			})
		}

		const transparentUnlessGuide = () => 'transparent'
		const c = new Chart(canvas, {
			type: 'line',
			data: { labels, datasets },
			options: {
				responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
				plugins: { legend: { display: false }, tooltip: { enabled: false } },
				interaction: { mode: 'nearest', intersect: false },
				scales: {
					x: { display: false },
					y: {
						display: true, min: -25, max: 55, position: 'left',
						border: { display: false },
						grid: { color: transparentUnlessGuide, drawTicks: false },
						ticks: {
							stepSize: 1,
							color: transparentUnlessGuide,
							font: { family: 'monospace', size: 12, weight: 'bold' },
							padding: 5,
							callback: (val) =>
								val === 1 ? 'A' : val === 9 ? 'I' : val === 18 ? 'R' : val === 26 ? 'Z' : null
						}
					}
				}
			}
		})
		return c
	}

	function miniChart(r: GuessResult): Chart {
		const borderColor = cssVar('--text-muted')
		const guessColor = cssVar('--accent-guess')
		return new Chart(canvas, {
			type: 'line',
			data: {
				labels,
				datasets: [
					{ data: r.upper, borderColor, borderDash: [2, 2], borderWidth: 1, fill: false, pointRadius: 0, tension: 0.4 },
					{ data: r.lower, borderColor, borderDash: [2, 2], borderWidth: 1, fill: false, pointRadius: 0, tension: 0.4 },
					{ data: r.wave, borderColor: guessColor, borderWidth: 1.5, pointRadius: 0, tension: 0.4 }
				]
			},
			options: {
				responsive: true, maintainAspectRatio: false, animation: false,
				plugins: { legend: { display: false }, tooltip: { enabled: false } },
				scales: { x: { display: false }, y: { display: false, min: -25, max: 55 } }
			}
		})
	}

	// Redraw (destroy then recreate, as the original did) whenever inputs change.
	$effect(() => {
		const chart = mini && result ? miniChart(result) : mainChart()
		return () => chart.destroy()
	})
</script>

<canvas bind:this={canvas}></canvas>
