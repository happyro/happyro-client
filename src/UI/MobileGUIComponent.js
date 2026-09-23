/**
 * UI/MobileGUIComponent.js
 *
 * Base class for all mobile UI components.
 * Extends GUIComponent and disables desktop-only interactions
 * (drag, right-click, cursor changes) while providing touch primitives.
 */

import GUIComponent from 'UI/GUIComponent.js';

const LONG_PRESS_MS = 500;

class MobileGUIComponent extends GUIComponent {
	constructor(name, cssText) {
		super(name, cssText);
		// Mobile components are never draggable and never block mouse intersect
		this.mouseMode = GUIComponent.MouseMode.CROSS;
		this.needFocus = false;
	}

	// ─── Disable desktop-only APIs ─────────────────────────

	/** No-op: mobile has no drag. */
	draggable() {
		return this;
	}

	// ─── Touch primitives ──────────────────────────────────

	/**
	 * Attach a tap handler to an element inside this component.
	 * Fires on touchend if the finger didn't move, falls back to click.
	 *
	 * @param {HTMLElement} el
	 * @param {function(Event): void} fn
	 * @returns {function} cleanup function
	 */
	onTap(el, fn) {
		let moved = false;

		const onStart = () => { moved = false; };
		const onMove = () => { moved = true; };
		const onEnd = e => { if (!moved) fn(e); };

		el.addEventListener('touchstart', onStart, { passive: true });
		el.addEventListener('touchmove', onMove, { passive: true });
		el.addEventListener('touchend', onEnd);
		el.addEventListener('click', fn); // mouse fallback in browser dev tools

		return () => {
			el.removeEventListener('touchstart', onStart);
			el.removeEventListener('touchmove', onMove);
			el.removeEventListener('touchend', onEnd);
			el.removeEventListener('click', fn);
		};
	}

	/**
	 * Attach a long-press handler to an element.
	 * Replaces right-click context menus on mobile.
	 *
	 * @param {HTMLElement} el
	 * @param {function(Event): void} fn
	 * @returns {function} cleanup function
	 */
	onLongPress(el, fn) {
		let timer = null;

		const onStart = e => {
			timer = setTimeout(() => {
				timer = null;
				fn(e);
			}, LONG_PRESS_MS);
		};

		const onCancel = () => {
			if (timer) { clearTimeout(timer); timer = null; }
		};

		el.addEventListener('touchstart', onStart, { passive: true });
		el.addEventListener('touchend', onCancel);
		el.addEventListener('touchmove', onCancel, { passive: true });
		el.addEventListener('touchcancel', onCancel);
		el.addEventListener('contextmenu', fn); // mouse fallback

		return () => {
			onCancel();
			el.removeEventListener('touchstart', onStart);
			el.removeEventListener('touchend', onCancel);
			el.removeEventListener('touchmove', onCancel);
			el.removeEventListener('touchcancel', onCancel);
			el.removeEventListener('contextmenu', fn);
		};
	}

	/**
	 * Attach a swipe handler to an element.
	 * Calls fn with direction: 'left' | 'right' | 'up' | 'down'.
	 *
	 * @param {HTMLElement} el
	 * @param {function(string): void} fn
	 * @param {number} [threshold=40] - minimum px distance to qualify
	 * @returns {function} cleanup function
	 */
	onSwipe(el, fn, threshold = 40) {
		let startX = 0, startY = 0;

		const onStart = e => {
			startX = e.touches[0].clientX;
			startY = e.touches[0].clientY;
		};

		const onEnd = e => {
			const dx = e.changedTouches[0].clientX - startX;
			const dy = e.changedTouches[0].clientY - startY;
			if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
			if (Math.abs(dx) >= Math.abs(dy)) {
				fn(dx > 0 ? 'right' : 'left');
			} else {
				fn(dy > 0 ? 'down' : 'up');
			}
		};

		el.addEventListener('touchstart', onStart, { passive: true });
		el.addEventListener('touchend', onEnd);

		return () => {
			el.removeEventListener('touchstart', onStart);
			el.removeEventListener('touchend', onEnd);
		};
	}
}

export default MobileGUIComponent;
