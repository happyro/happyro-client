// Manual input arbitration. Producers do not depend on a combat controller or UI.
const listeners = new Set();

export function subscribeGameInput(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function notifyGameInput(kind, targetId) {
	let handled = false;
	for (const listener of listeners) handled = listener(kind, targetId) || handled;
	return handled;
}
