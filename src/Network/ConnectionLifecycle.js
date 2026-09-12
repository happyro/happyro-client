const listeners = new Set();

export function onConnectionEnd(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function endConnection() {
	for (const listener of listeners) {
		try { listener(); } catch (error) { console.error('[Network] Connection cleanup failed', error); }
	}
}
