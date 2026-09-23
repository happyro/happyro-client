/** Server-driven windows share a single mobile modal owner. No DOM or protocol here. */
let current = null;
let revision = 0;
const listeners = new Set();
export function interactionSnapshot() {
	return current;
}
export function showInteraction(state) {
	current = { ...state, revision: ++revision };
	for (const listener of listeners) listener(current);
}
export function clearInteraction(kind) {
	if (kind && current?.kind !== kind) return;
	current = null;
	for (const listener of listeners) listener(null);
}
export function subscribeInteraction(listener) {
	listeners.add(listener);
	listener(current);
	return () => listeners.delete(listener);
}
