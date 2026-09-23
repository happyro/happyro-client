/**
 * UI/RotationGuard.js
 *
 * Shows a full-screen "please rotate" overlay when a mobile device
 * is in portrait mode. Hides automatically when the user rotates to landscape.
 * Only active when Platform.isMobile is true.
 */

import Platform from 'UI/Platform.js';

const CSS = `
	#ro-rotation-guard {
		display: none;
		position: fixed;
		inset: 0;
		z-index: 99999;
		background: #0a0a0a;
		color: #e8e8e8;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		font-family: sans-serif;
		font-size: 16px;
		text-align: center;
		user-select: none;
	}
	#ro-rotation-guard.visible {
		display: flex;
	}
	#ro-rotation-guard svg {
		width: 56px;
		height: 56px;
		animation: ro-spin 2s ease-in-out infinite;
	}
	@keyframes ro-spin {
		0%   { transform: rotate(0deg); }
		40%  { transform: rotate(90deg); }
		100% { transform: rotate(90deg); }
	}
	@media (prefers-reduced-motion: reduce) {
		#ro-rotation-guard svg { animation: none; transform: rotate(45deg); }
	}
`;

const ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="#e8e8e8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
	<rect x="4" y="2" width="16" height="20" rx="2"/>
	<line x1="12" y1="18" x2="12" y2="18.5"/>
</svg>`;

let _guard = null;
let _unsub = null;

function _setVisible(portrait) {
	if (_guard) _guard.classList.toggle('visible', portrait);
}

/**
 * Mount the rotation guard. Safe to call multiple times.
 * Does nothing on desktop.
 */
function init() {
	if (!Platform.isMobile || _guard) return;

	const style = document.createElement('style');
	style.textContent = CSS;
	document.head.appendChild(style);

	_guard = document.createElement('div');
	_guard.id = 'ro-rotation-guard';
	_guard.setAttribute('role', 'alert');
	_guard.setAttribute('aria-live', 'polite');
	_guard.innerHTML = `${ICON_SVG}<span>请将设备旋转至横屏</span>`;
	document.body.appendChild(_guard);

	_setVisible(Platform.orientation === 'portrait');
	_unsub = Platform.onOrientationChange(o => _setVisible(o === 'portrait'));
}

/**
 * Unmount the rotation guard and clean up listeners.
 */
function destroy() {
	if (_unsub) { _unsub(); _unsub = null; }
	if (_guard) { _guard.remove(); _guard = null; }
}

export default { init, destroy };
