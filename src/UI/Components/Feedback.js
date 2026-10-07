import { showToast, clearToast } from './Toast.js';

/** Explicit actions may repeat; polling must not replay or erase their notification. */
export function createFeedback(container) {
	const lifetime = document.createComment('menu feedback');
	container?.append(lifetime);
	let lastMessage = '',
		lastState = '';
	const notify = (message, kind = 'info') => {
		if (!lifetime.isConnected) return;
		lastMessage = message || '';
		if (message) showToast(container, message, kind);
		else clearToast(container);
	};
	notify.update = (message, kind = 'info') => {
		const next = message || '';
		if (next !== lastState) {
			lastState = next;
			if (next && next !== lastMessage) notify(next, kind);
		}
	};
	return notify;
}
