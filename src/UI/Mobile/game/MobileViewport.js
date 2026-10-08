import { updateMenuLayout } from './MenuLayout.js';
const editable =
	'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]), textarea, select';

/** Reveal a field by scrolling this overlay only, never the game document. */
function revealField(host, input) {
	const viewport = host.getBoundingClientRect();
	let parent = input.parentElement || host;
	while (parent) {
		const style = getComputedStyle(parent);
		if (/(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight) {
			const bounds = parent.getBoundingClientRect();
			const top = Math.max(bounds.top, viewport.top) + 8;
			const bottom = Math.min(bounds.bottom, viewport.bottom) - 8;
			const field = input.getBoundingClientRect();
			if (bottom > top) {
				if (field.height > bottom - top || field.top < top) parent.scrollTop += Math.floor(field.top - top);
				else if (field.bottom > bottom) parent.scrollTop += Math.ceil(field.bottom - bottom);
			}
		}
		if (parent === host) break;
		parent = parent.parentElement || (parent.getRootNode() === host.shadowRoot ? host : null);
	}
}

/** Keep the layout stable while a software keyboard covers part of the screen. */
export function createMobileViewport(host) {
	let layoutHeight = window.innerHeight;
	let layoutWidth = window.innerWidth;
	let keyboardOpen = false;
	let frame;
	let destroyed = false;
	function update() {
		if (destroyed) return;
		const visual = window.visualViewport;
		const width = document.documentElement.clientWidth || window.innerWidth;
		const height = document.documentElement.clientHeight || window.innerHeight;
		const input = host.shadowRoot?.activeElement;
		const editing = input?.matches(editable);
		const rotated = width !== layoutWidth;
		const visibleHeight = Math.min(visual?.height || height, height);
		const keyboard = !rotated && (editing || keyboardOpen) && visibleHeight < layoutHeight - 80;
		if (!keyboard) {
			layoutHeight = height;
			layoutWidth = width;
			updateMenuLayout(host, width, height);
		}
		keyboardOpen = Boolean(keyboard);
		Object.assign(host.style, {
			width: `${width}px`,
			height: `${visibleHeight}px`,
			left: '0px',
			top: `${visual?.offsetTop || 0}px`
		});
		host.style.setProperty('--mobile-visual-top', `${visual?.offsetTop || 0}px`);
		host.style.setProperty('--mobile-layout-height', `${keyboard ? layoutHeight : visibleHeight}px`);
		host.style.setProperty('--mobile-visible-height', `${visibleHeight}px`);
		host.classList.toggle('keyboard-open', keyboardOpen);
		cancelAnimationFrame(frame);
		if (!editing) return;
		frame = requestAnimationFrame(() => {
			if (host.isConnected && editing && host.shadowRoot.activeElement === input) revealField(host, input);
		});
	}
	update.destroy = () => {
		destroyed = true;
		cancelAnimationFrame(frame);
	};
	return update;
}

/** Independent dialogs share the same viewport lifecycle as game windows. */
export function bindMobileViewport(host) {
	const update = createMobileViewport(host);
	const abort = new AbortController();
	for (const event of ['resize', 'scroll'])
		window.visualViewport?.addEventListener(event, update, { signal: abort.signal });
	window.addEventListener('resize', update, { signal: abort.signal });
	update();
	return () => {
		abort.abort();
		update.destroy();
	};
}
