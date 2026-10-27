// Per-tab persistence. Keys are `puzzle:<name>`. Storage failures never throw.

export function loadSession<T>(key: string, isValid: (v: unknown) => v is T): T | null {
	try {
		const raw = sessionStorage.getItem(key)
		if (raw === null) return null
		const parsed: unknown = JSON.parse(raw)
		return isValid(parsed) ? parsed : null
	} catch {
		return null
	}
}

export function saveSession(key: string, value: unknown): void {
	try {
		sessionStorage.setItem(key, JSON.stringify(value))
	} catch {
		// storage unavailable or full: progress just won't survive a reload
	}
}

export function clearSession(key: string): void {
	try {
		sessionStorage.removeItem(key)
	} catch {
		// ignore
	}
}
