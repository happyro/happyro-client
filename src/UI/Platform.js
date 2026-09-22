/**
 * UI/Platform.js
 *
 * Single source of truth for platform detection and orientation state.
 * Import this anywhere — it has no side effects beyond a resize listener.
 */

const _coarse = window.matchMedia('(pointer: coarse)');

/**
 * True for phones and tablets (touch-primary devices).
 * Determined once at load time; does not change during a session.
 * @type {boolean}
 */
const isMobile = _coarse.matches;

let _orientation = window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';

/** @type {Set<function>} */
const _listeners = new Set();

function _update() {
	const next = window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';
	if (next === _orientation) return;
	_orientation = next;
	for (const fn of _listeners) fn(_orientation);
}

window.addEventListener('resize', _update);
if (screen.orientation) {
	screen.orientation.addEventListener('change', _update);
}

const Platform = {
	/** True on phones and tablets. */
	isMobile,

	/** True on desktop / mouse-primary devices. */
	isDesktop: !isMobile,

	/** Current orientation: 'landscape' | 'portrait' */
	get orientation() {
		return _orientation;
	},

	/**
	 * Register a callback for orientation changes.
	 * @param {function('landscape'|'portrait'): void} fn
	 * @returns {function} unsubscribe function
	 */
	onOrientationChange(fn) {
		_listeners.add(fn);
		return () => _listeners.delete(fn);
	}
};

export default Platform;
