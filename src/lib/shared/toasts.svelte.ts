// A tiny toast queue (replaces @zerodevx/svelte-toast). Render it with Toast.svelte.

export type ToastItem = {
	id: number;
	msg: string;
	/** CSS background for this toast; falls back to --toast-background. */
	background?: string;
	/** Runs when the toast is removed, by timeout or by pop(). */
	onpop?: () => void;
};

export type ToastOptions = Omit<ToastItem, 'id' | 'msg'> & { duration?: number };

export class Toasts {
	items = $state<ToastItem[]>([]);
	#timers = new Map<number, ReturnType<typeof setTimeout>>();
	#nextId = 1;

	constructor(readonly duration = 2000) {}

	push(msg: string, { duration = this.duration, ...opts }: ToastOptions = {}): number {
		const id = this.#nextId++;
		this.items = [...this.items, { id, msg, ...opts }];
		this.#timers.set(
			id,
			setTimeout(() => this.pop(id), duration)
		);
		return id;
	}

	/** Removes the toast with `id`, or the newest one when no id is given. */
	pop(id?: number): void {
		const item = id === undefined ? this.items.at(-1) : this.items.find((t) => t.id === id);
		if (!item) return;
		clearTimeout(this.#timers.get(item.id));
		this.#timers.delete(item.id);
		this.items = this.items.filter((t) => t !== item);
		item.onpop?.();
	}

	/** Drops every toast without running callbacks (for teardown). */
	clear(): void {
		for (const timer of this.#timers.values()) clearTimeout(timer);
		this.#timers.clear();
		this.items = [];
	}
}
