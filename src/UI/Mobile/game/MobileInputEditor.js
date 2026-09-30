import css from './MobileInputEditor.css?raw';

const editable =
	'textarea, input:not([type]), input[type=text], input[type=search], input[type=number], input[type=password], input[type=email], input[type=url], input[type=tel]';

/** Edit a draft outside the menu so keyboard resizing cannot disturb its layout. */
export function createMobileInputEditor(host) {
	const root = host.shadowRoot;
	let close;
	function open(focusEvent) {
		const source = focusEvent.target;
		if (close || !source.matches?.(editable) || source.disabled || source.readOnly) return;
		if (focusEvent.type === 'pointerdown' && focusEvent.button !== 0) return;
		focusEvent.preventDefault();
		focusEvent.stopImmediatePropagation();
		const overlay = document.createElement('div');
		overlay.dataset.mobileInputEditor = '';
		const editor = overlay.attachShadow({ mode: 'open' });
		editor.innerHTML = `<style>${css}</style><dialog aria-labelledby="editor-title"><section><span id="editor-title"></span><button type="button" data-cancel>取消</button><main></main><button type="button" data-done>完成</button></section></dialog>`;
		const dialog = editor.querySelector('dialog');
		const content = editor.querySelector('section');
		const title =
			source.getAttribute('aria-label') ||
			source.labels?.[0]?.textContent.trim() ||
			source.placeholder ||
			'输入内容';
		editor.querySelector('#editor-title').textContent = title;
		const field = source.cloneNode(true);
		field.removeAttribute('id');
		field.removeAttribute('name');
		field.removeAttribute('style');
		field.removeAttribute('class');
		field.removeAttribute('autofocus');
		field.setAttribute('aria-label', title);
		if (!field.placeholder) field.placeholder = title;
		field.setAttribute('enterkeyhint', field.tagName === 'TEXTAREA' ? 'enter' : 'done');
		field.value = source.value;
		editor.querySelector('main').append(field);
		const originalInert = host.inert;
		const abort = new AbortController();
		function resize() {
			const visual = window.visualViewport;
			content.style.top = `${visual?.offsetTop || 0}px`;
			content.style.height = `${visual?.height || window.innerHeight}px`;
			dialog.style.height = `${Math.max(window.innerHeight, document.documentElement.clientHeight, (visual?.height || 0) + (visual?.offsetTop || 0))}px`;
		}
		close = () => {
			abort.abort();
			field.blur();
			dialog.close();
			overlay.remove();
			host.inert = originalInert;
			close = null;
		};
		function done() {
			if (!field.reportValidity()) return;
			const value = field.value;
			close();
			if (!source.isConnected || source.value === value) return;
			source.value = value;
			source.dispatchEvent(new Event('input', { bubbles: true }));
			source.dispatchEvent(new Event('change', { bubbles: true }));
		}
		dialog.addEventListener('cancel', event => {
			event.preventDefault();
			close();
		});
		editor.querySelector('[data-cancel]').addEventListener('click', () => close());
		editor.querySelector('[data-done]').addEventListener('click', done);
		editor.addEventListener('keydown', event => {
			event.stopPropagation();
			if (event.isComposing || event.keyCode === 229) return;
			if (event.key === 'Escape') {
				event.preventDefault();
				close();
			} else if (event.key === 'Enter' && field.tagName !== 'TEXTAREA') {
				event.preventDefault();
				done();
			}
		});
		for (const type of ['keyup', 'keypress', 'pointerdown', 'pointerup', 'click', 'touchstart', 'touchend']) {
			editor.addEventListener(type, event => event.stopPropagation());
		}
		window.visualViewport?.addEventListener('resize', resize, { signal: abort.signal });
		window.visualViewport?.addEventListener('scroll', resize, { signal: abort.signal });
		window.addEventListener('resize', resize, { signal: abort.signal });
		resize();
		document.body.append(overlay);
		source.blur();
		dialog.showModal();
		// Focus synchronously within the user's gesture so iOS keeps its keyboard open.
		field.focus({ preventScroll: true });
		host.inert = true;
		if (field.selectionStart !== null) field.setSelectionRange(field.value.length, field.value.length);
	}
	root.addEventListener('pointerdown', open, true);
	root.addEventListener('focusin', open, true);
	return () => {
		root.removeEventListener('pointerdown', open, true);
		root.removeEventListener('focusin', open, true);
		close?.();
	};
}
