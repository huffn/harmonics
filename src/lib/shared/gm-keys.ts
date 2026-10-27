// Hidden GM shortcuts, matched on KeyboardEvent.code so Alt-modified characters
// (e.g. Alt+N = dead key on macOS) don't matter.

export type GmAction = 'advance' | 'reset'

const CODES: Record<string, GmAction> = { KeyN: 'advance', KeyR: 'reset' }

export function gmActionFor(
	e: Pick<KeyboardEvent, 'code' | 'altKey' | 'shiftKey' | 'ctrlKey' | 'metaKey'>
): GmAction | null {
	if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return null
	return CODES[e.code] ?? null
}

/** Adds a capture-phase window listener; returns the remover. */
export function gmKeys(handlers: Partial<Record<GmAction, () => void>>): () => void {
	const onKey = (e: KeyboardEvent) => {
		const action = gmActionFor(e)
		const handler = action && handlers[action]
		if (!handler) return
		e.preventDefault()
		e.stopImmediatePropagation()
		handler()
	}
	window.addEventListener('keydown', onKey, true)
	return () => window.removeEventListener('keydown', onKey, true)
}
