import css from './Confirmation.css?raw';

const active = new WeakMap();

/** Modal confirmation shared by menus and adventure tools. Returns a cancellation function. */
export function confirmAction(container, message, action, { content, cancelled = () => {} } = {}) {
	active.get(container)?.();
	const dialog = document.createElement('dialog');
	dialog.className = 'ui-confirm';
	dialog.setAttribute('aria-label', '操作确认');
	const style = document.createElement('style');
	style.textContent = css;
	const text = document.createElement('p');
	text.textContent = message;
	text.tabIndex = -1;
	text.autofocus = true;
	const buttons = document.createElement('div');
	buttons.className = 'ui-confirm-actions';
	const cancel = document.createElement('button');
	cancel.type = 'button';
	cancel.dataset.cancel = '';
	cancel.textContent = '取消';
	const confirm = document.createElement('button');
	confirm.type = 'button';
	confirm.dataset.confirm = '';
	confirm.textContent = '确认';
	let finished = false;
	const finish = accepted => {
		if (finished) return;
		finished = true;
		observer.disconnect();
		dialog.close();
		dialog.remove();
		if (active.get(container) === dismiss) active.delete(container);
		if (accepted && container.isConnected) action();
		else cancelled();
	};
	const dismiss = () => finish(false);
	const visible = () => {
		for (let node = container; node; node = node.parentElement || node.getRootNode().host) {
			if (node.hidden || node.style?.display === 'none') return false;
		}
		return container.isConnected && dialog.isConnected;
	};
	const observer = new MutationObserver(() => {
		if (!visible()) dismiss();
	});
	cancel.onclick = dismiss;
	confirm.onclick = () => {
		if (content && ![...content.querySelectorAll('input, select, textarea')].every(field => field.reportValidity()))
			return;
		finish(true);
	};
	dialog.addEventListener('cancel', event => {
		event.preventDefault();
		dismiss();
	});
	buttons.append(cancel, confirm);
	dialog.append(style, text);
	if (content) dialog.append(content);
	dialog.append(buttons);
	container.append(dialog);
	active.set(container, dismiss);
	const options = { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style'] };
	observer.observe(document.body, options);
	const root = container.getRootNode();
	if (root instanceof ShadowRoot) observer.observe(root, options);
	dialog.showModal();
	return dismiss;
}

export function requestConfirmation(container, message) {
	return new Promise(resolve =>
		confirmAction(container, message, () => resolve(true), { cancelled: () => resolve(false) })
	);
}
