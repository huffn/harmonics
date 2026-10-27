// Forgiving answer matching for the memory riddles.

export type MemoryState = { index: number } // 0-3; 3 = solved

export function isMemoryState(v: unknown): v is MemoryState {
	const i = (v as { index?: unknown } | null)?.index
	return typeof i === 'number' && Number.isInteger(i) && i >= 0 && i <= 3
}

/** Lowercase, strip accents and punctuation, collapse whitespace, drop one leading article. */
export function normalizeAnswer(s: string): string {
	const t = s
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s]/gu, '')
		.replace(/\s+/g, ' ')
		.trim()
	return t.replace(/^(a|an|the) /, '')
}

/** Levenshtein distance. */
export function editDistance(a: string, b: string): number {
	let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
	for (let i = 1; i <= a.length; i++) {
		const cur = [i]
		for (let j = 1; j <= b.length; j++) {
			cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
		}
		prev = cur
	}
	return prev[b.length]
}

/** Typos forgiven for an answer: <=4 chars none, 5-8 one, 9+ two. */
export function allowedTypos(answer: string): number {
	const n = normalizeAnswer(answer).length
	return n <= 4 ? 0 : n <= 8 ? 1 : 2
}

export function isAcceptable(input: string, answers: string[]): boolean {
	const got = normalizeAnswer(input)
	if (!got) return false
	return answers.some((a) => editDistance(got, normalizeAnswer(a)) <= allowedTypos(a))
}
