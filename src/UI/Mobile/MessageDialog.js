import tokens from './tokens.css?raw';
import css from './MessageDialog.css?raw';

const activeDialogs = new Set();
export function removeMobileDialogs() {
	for (const dialog of activeDialogs) dialog.remove();
}

const labels = { ok: '确定', yes: '确定', cancel: '取消', no: '取消', close: '关闭', next: '继续' };

/** Shared mobile presentation for UIManager messages, confirmations and errors. */
export function showMobileDialog({ text, title = '提示', buttons, onCancel, keyboardAccept = false, preserveLineBreaks = false }) {
	const host = document.createElement('div');
	host.className = 'mobile-message-host';
	const root = host.attachShadow({ mode: 'open' });
	root.innerHTML = `<style>${tokens}${css}</style><dialog aria-labelledby="message-title" aria-describedby="message-text">
		<div class="container"><h2 id="message-title" tabindex="-1" autofocus></h2><p id="message-text" class="text"></p></div>
		<div class="btns"></div></dialog>`;
	const dialog = root.querySelector('dialog');
	const heading = root.querySelector('h2');
	heading.textContent = title;
	root.querySelector('.text').textContent = text;
	root.querySelector('.text').classList.toggle('preserve-line-breaks', preserveLineBreaks);
	let finished = false;
	const component = {
		_host: host, _shadow: root,
		append() {
			if (dialog.open) return;
			finished = false;
			document.body.append(host);
			activeDialogs.add(component);
			dialog.showModal();
			heading.focus({ preventScroll: true });
		},
		remove() {
			finished = true;
			if (dialog.open) dialog.close();
			host.remove();
			activeDialogs.delete(component);
		}
	};
	const finish = callback => {
		if (finished) return;
		component.remove();
		callback?.();
	};
	for (const { name, callback, primary } of buttons) {
		const button = document.createElement('button');
		button.type = 'button';
		button.textContent = labels[name.toLowerCase()] || name;
		button.classList.toggle('primary', !!primary);
		button.addEventListener('click', () => finish(callback));
		root.querySelector('.btns').append(button);
	}
	// Keep native button clicks and scrolling out of the game's touch handlers.
	for (const type of ['touchstart', 'touchmove', 'touchend', 'mousedown', 'mouseup', 'click']) {
		dialog.addEventListener(type, event => event.stopPropagation(), { passive: true });
	}
	dialog.addEventListener('cancel', event => {
		event.preventDefault();
		if (onCancel) finish(onCancel);
		else if (keyboardAccept) finish(buttons[0]?.callback);
	});
	dialog.addEventListener('keydown', event => {
		event.stopPropagation();
		if (keyboardAccept && event.key === 'Enter' && event.target === heading) {
			event.preventDefault();
			finish(buttons[0]?.callback);
		}
	});
	dialog.addEventListener('keyup', event => event.stopPropagation());
	component.append();
	return component;
}
