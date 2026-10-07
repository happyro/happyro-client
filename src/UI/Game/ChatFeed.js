/** Shared bounded message stream; independent of either chat view. */
const messages = [];
let sequence = 0;
const listeners = new Set();
export function publishChatMessage(message) {
	messages.push(Object.freeze({ ...message, id: ++sequence }));
	if (messages.length > 80) messages.shift();
	for (const listener of listeners) listener(messages.slice());
}
export function subscribeChatFeed(listener) {
	listeners.add(listener);
	listener(messages.slice());
	return () => listeners.delete(listener);
}
export function clearChatFeed() {
	messages.length = 0;
	for (const listener of listeners) listener([]);
}
