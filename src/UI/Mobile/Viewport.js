/** The mobile app owns the viewport; only its inner panels may scroll. */
export const MOBILE_VIEWPORT_CONTENT = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

let initialized = false;

export function resetPagePosition() {
	if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
}

export function lockMobileViewport() {
	if (initialized) return;
	initialized = true;
	let meta = document.querySelector('meta[name="viewport"]');
	if (!meta) {
		meta = document.createElement('meta');
		meta.name = 'viewport';
		document.head.appendChild(meta);
	}
	meta.content = MOBILE_VIEWPORT_CONTENT;
	for (const element of [document.documentElement, document.body]) {
		Object.assign(element.style, {
			position: 'fixed', inset: '0', width: '100%', height: '100%',
			margin: '0', overflow: 'hidden', overscrollBehavior: 'none',
			touchAction: 'pan-x pan-y'
		});
	}
	// A previous landscape canvas must not widen the portrait layout viewport.
	document.body.style.contain = 'strict';
	resetPagePosition();
	window.addEventListener('scroll', resetPagePosition, { passive: true });

	// Cancel browser zoom, without stopping the game's own two-finger handlers.
	const preventGesture = event => { if (event.cancelable) event.preventDefault(); };
	for (const type of ['gesturestart', 'gesturechange']) {
		document.addEventListener(type, preventGesture, { capture: true, passive: false });
	}
	for (const type of ['touchstart', 'touchmove']) {
		document.addEventListener(type, event => {
			if (event.touches.length > 1) preventGesture(event);
		}, { capture: true, passive: false });
	}
	document.addEventListener('wheel', event => {
		if (event.ctrlKey) preventGesture(event);
	}, { capture: true, passive: false });
}
