import GUIComponent from 'UI/GUIComponent.js';
import Renderer from 'Renderer/Renderer.js';
import { MOBILE_VIEWPORT_CONTENT, resetPagePosition } from './Viewport.js';

let owners = 0;
let viewport;
let originalContent;
let created = false;
let documentStyles;
let documentScroll;
let restoreFrame;

function acquireViewport() {
	cancelAnimationFrame(restoreFrame);
	if (owners++ || viewport) return;
	documentScroll = { left: 0, top: 0 };
	resetPagePosition();
	const style = document.documentElement.style;
	documentStyles = ['overflow', 'overscroll-behavior'].map(property => [
		property,
		style.getPropertyValue(property),
		style.getPropertyPriority(property)
	]);
	// Existing game backgrounds retain their game-sized canvas. Prevent them
	// from making the document itself scroll underneath the phone auth panel.
	style.setProperty('overflow', 'hidden');
	style.setProperty('overscroll-behavior', 'none');
	viewport = document.querySelector('meta[name="viewport"]');
	created = !viewport;
	if (created) {
		viewport = document.createElement('meta');
		viewport.name = 'viewport';
		document.head.appendChild(viewport);
	}
	originalContent = viewport.getAttribute('content');
	viewport.setAttribute('content', MOBILE_VIEWPORT_CONTENT);
}

function releaseViewport() {
	owners--;
	// Selection -> creation transitions happen synchronously. Keep the viewport
	// stable between panels, but restore the game's original viewport on exit.
	queueMicrotask(() => {
		if (owners || !viewport) return;
		if (created) viewport.remove();
		else if (originalContent === null) viewport.removeAttribute('content');
		else viewport.setAttribute('content', originalContent);
		for (const [property, value, priority] of documentStyles) {
			if (value) document.documentElement.style.setProperty(property, value, priority);
			else document.documentElement.style.removeProperty(property);
		}
		viewport = undefined;
		const position = documentScroll;
		window.scrollTo(position.left, position.top);
		// Meta viewport changes are applied during layout. Reconcile the game
		// after that layout, independently of its paused loading/render loop.
		restoreFrame = requestAnimationFrame(() => {
			restoreFrame = requestAnimationFrame(() => {
				if (owners) return;
				window.scrollTo(position.left, position.top);
				Renderer.resize();
				window.happyroDiagnostic?.('loading.stage', {
					stage: 'mobile-auth.viewport.restored',
					message: JSON.stringify({
						width: window.innerWidth,
						height: window.innerHeight,
						scrollX: window.scrollX,
						scrollY: window.scrollY,
						visualHeight: window.visualViewport?.height,
						offsetTop: window.visualViewport?.offsetTop
					})
				});
			});
		});
	});
}

/** Attach only to phone authentication components; never change GUIComponent globally. */
export function withMobileShell(component) {
	component.nativeScrolling = true;
	component.needFocus = false;
	component.mouseMode = GUIComponent.MouseMode.FREEZE;
	const init = component.init;
	const append = component.onAppend;
	const remove = component.onRemove;
	const keydown = component.onKeyDown;
	let attached = false;
	let frame;
	const visual = window.visualViewport;
	const resize = () => {
		const host = component._host;
		resetPagePosition();
		const width = document.documentElement.clientWidth || window.innerWidth;
		const height = document.documentElement.clientHeight || window.innerHeight;
		const editing = component._shadow.activeElement?.matches('input, select, textarea');
		const keyboardVisible = editing && visual && visual.height < height;
		host.style.setProperty('--auth-top', `${keyboardVisible ? Math.max(0, visual.offsetTop) : 0}px`);
		host.style.setProperty('--auth-left', '0px');
		host.style.setProperty('--auth-width', `${width}px`);
		host.style.setProperty('--auth-height', `${Math.min(visual?.height || height, height)}px`);
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			const input = component._shadow.activeElement;
			if (input?.matches('input, select, textarea')) {
				// scrollIntoView also scrolls ancestor documents, even when their
				// overflow is hidden. Move only this panel, never the game page.
				const field = input.getBoundingClientRect();
				const panel = host.getBoundingClientRect();
				if (field.bottom > panel.bottom - 12) host.scrollTop += field.bottom - panel.bottom + 12;
				else if (field.top < panel.top + 12) host.scrollTop -= panel.top + 12 - field.top;
			}
		});
	};
	component.init = function () {
		init?.call(this);
		for (const type of ['focusin', 'focusout']) {
			this._shadow.addEventListener(type, () => queueMicrotask(() => {
				if (attached) resize();
			}));
		}
		this._shadow.addEventListener('keydown', event => {
			if (event.key !== 'Enter' || event.isComposing) return;
			const input = event.target;
			const hint = input.getAttribute('enterkeyhint');
			if (hint !== 'next' && hint !== 'done') return;
			event.preventDefault();
			event.stopPropagation();
			if (hint === 'done') input.blur();
			else {
				const fields = [
					...this._shadow.querySelectorAll('input[type=text], input[type=password], textarea, select')
				];
				fields[fields.indexOf(input) + 1]?.focus();
			}
		});
		// Keep native scrolling and controls, without forwarding touches to the game.
		for (const type of ['touchstart', 'touchmove', 'touchend']) {
			this._host.addEventListener(type, event => event.stopPropagation(), { passive: true });
		}
	};
	component.onKeyDown = function (event) {
		if (event.isComposing) return true;
		const target = event.composedPath?.()[0] || event.target;
		// Native controls own their activation/navigation keys. Window-level game
		// shortcuts must also leave external editors (such as diagnostics) alone.
		if (target?.matches?.('button, a, select, input[type=radio], input[type=checkbox]')) return true;
		if (target?.matches?.('input, textarea, [contenteditable]') && !this._shadow.contains(target)) return true;
		return keydown?.call(this, event);
	};
	component.onAppend = function () {
		if (!attached) {
			attached = true;
			acquireViewport();
			visual?.addEventListener('resize', resize);
			visual?.addEventListener('scroll', resize);
			window.addEventListener('resize', resize);
		}
		append?.call(this);
		resize();
	};
	component.onRemove = function () {
		this._shadow.activeElement?.blur();
		remove?.call(this);
		if (!attached) return;
		attached = false;
		cancelAnimationFrame(frame);
		visual?.removeEventListener('resize', resize);
		visual?.removeEventListener('scroll', resize);
		window.removeEventListener('resize', resize);
		releaseViewport();
	};
	return component;
}
