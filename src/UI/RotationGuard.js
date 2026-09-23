/** Landscape is required only while entering or playing the game. */
import Platform from 'UI/Platform.js';
import { onConnectionEnd } from 'Network/ConnectionLifecycle.js';

let overlay;
let unsubscribe;
let cancelOnDisconnect;
let pending;

function update() {
	const portrait = Platform.orientation === 'portrait';
	overlay.hidden = !portrait;
	if (!portrait && pending) {
		const proceed = pending;
		pending = null;
		cancelOnDisconnect?.();
		cancelOnDisconnect = null;
		overlay.querySelector('button').hidden = true;
		proceed();
	}
}

function blockKeys(event) {
	if (overlay && !overlay.hidden && !overlay.contains(event.target)) {
		event.preventDefault();
		event.stopImmediatePropagation();
	}
}

function release() {
	window.removeEventListener('keydown', blockKeys, true);
	pending = null;
	cancelOnDisconnect?.();
	cancelOnDisconnect = null;
	unsubscribe?.();
	unsubscribe = null;
	overlay?.remove();
	overlay = null;
}

function requireLandscape(proceed) {
	if (!Platform.isMobile) { proceed(); return; }
	if (overlay) return;
	overlay = document.createElement('div');
	overlay.id = 'ro-rotation-guard';
	overlay.setAttribute('role', 'dialog');
	overlay.setAttribute('aria-modal', 'true');
	overlay.setAttribute('aria-label', '请将设备旋转至横屏');
	overlay.innerHTML = `<style>
		#ro-rotation-guard { position:fixed; inset:0; z-index:99999; background:#f8f9fb;
			color:#242830; display:flex; flex-direction:column; align-items:center;
			justify-content:center; gap:20px; padding:24px; text-align:center;
			font:18px/1.5 system-ui,sans-serif; touch-action:none; }
		#ro-rotation-guard[hidden], #ro-rotation-guard button[hidden] { display:none; }
		#ro-rotation-guard button { min-height:44px; padding:8px 24px; border:1px solid #dce1e8;
			border-radius:10px; background:transparent; color:inherit; font:inherit; }
	</style><span>请将设备旋转至横屏</span><button type="button">返回选角</button>`;
	for (const type of ['touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointerup', 'click', 'wheel']) {
		overlay.addEventListener(type, event => event.stopPropagation(), { passive: true });
	}
	overlay.addEventListener('keydown', event => event.stopPropagation());
	overlay.querySelector('button').addEventListener('click', release);
	document.body.appendChild(overlay);
	window.addEventListener('keydown', blockKeys, true);
	pending = proceed;
	cancelOnDisconnect = onConnectionEnd(() => { if (pending) release(); });
	unsubscribe = Platform.onOrientationChange(update);
	update();
}

export default { requireLandscape, release };
