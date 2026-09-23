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
import { lockMobileViewport } from 'UI/Mobile/Viewport.js';
import MobileWinLogin from 'UI/Mobile/WinLogin/WinLogin.js';

import MobileCharSelect from 'UI/Mobile/auth/CharSelect.js';
import MobileCharCreate from 'UI/Mobile/auth/CharCreate.js';

export function init() {
	lockMobileViewport();

	// WinLogin — mobile component is ready, override the controller path.
	UIVersionManager.registerMobileComponent('WinLogin', MobileWinLogin);
	UIVersionManager.registerMobileComponent('CharSelect', MobileCharSelect);
	UIVersionManager.registerMobileComponent('CharCreate', MobileCharCreate);
}
