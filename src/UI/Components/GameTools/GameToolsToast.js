const activeToasts = new WeakMap();

export function showGameToolsToast(container, message, kind = 'success') {
	const root = container?.closest('.game-tools-window');
	if (
		!root?.isConnected ||
		container.closest('.game-tools-tab')?.hidden ||
		root.getRootNode().host?.style.display === 'none'
	)
		return;
	const previous = activeToasts.get(root);
	if (previous) {
		clearTimeout(previous.timer);
		previous.element.remove();
	}
	const element = document.createElement('div');
	element.className = `game-tools-toast ${kind}`;
	element.setAttribute('role', 'status');
	element.setAttribute('aria-live', 'polite');
	const text = document.createElement('span');
	text.textContent = `${kind === 'info' ? 'ⓘ' : '✓'} ${message}`;
	const close = document.createElement('button');
	close.type = 'button';
	close.textContent = '×';
	close.setAttribute('aria-label', '关闭提示');
	const dismiss = () => {
		clearTimeout(record.timer);
		element.remove();
		if (activeToasts.get(root) === record) activeToasts.delete(root);
	};
	close.addEventListener('click', dismiss);
	element.append(text, close);
	root.append(element);
	const record = { element, timer: setTimeout(dismiss, 3000) };
	activeToasts.set(root, record);
}

export function clearGameToolsToast(container) {
	const root = container?.closest('.game-tools-window');
	const active = root && activeToasts.get(root);
	if (!active) return;
	clearTimeout(active.timer);
	active.element.remove();
	activeToasts.delete(root);
}
