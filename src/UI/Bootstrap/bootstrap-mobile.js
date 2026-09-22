/**
 * UI/Bootstrap/bootstrap-mobile.js
 *
 * Register mobile UI components and declare platform overrides.
 * Import and call init() once at app startup on mobile/tablet devices,
 * in place of (not in addition to) bootstrap-desktop.js.
 *
 * Components not yet rewritten for mobile fall back to the desktop
 * implementation automatically via UIVersionManager.registerPlatform().
 */

import UIVersionManager from 'UI/UIVersionManager.js';
import RotationGuard from 'UI/RotationGuard.js';
import MobileWinLogin from 'UI/Mobile/WinLogin/WinLogin.js';

export function init() {
	RotationGuard.init();

	// WinLogin — mobile component is ready, override the controller path.
	UIVersionManager.registerMobileComponent('WinLogin', MobileWinLogin);
}
