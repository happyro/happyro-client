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

import UIManager from 'UI/UIManager.js';
import UIVersionManager from 'UI/UIVersionManager.js';
import RotationGuard from 'UI/RotationGuard.js';

// Desktop fallbacks — loaded for components not yet ported to mobile.
import Intro from 'UI/Components/Intro/Intro.js';

// Mobile components — uncomment and import as each screen is rewritten:
// import MobileIntro from 'UI/Mobile/Intro/Intro.js';

export function init() {
	// Mount the landscape rotation guard.
	RotationGuard.init();

	// ─── Platform overrides ──────────────────────────────────────────────
	// When a mobile component is ready, add its registerPlatform() call here
	// and uncomment its import above.
	//
	// UIVersionManager.registerPlatform('Intro', {
	//   desktop: 'Intro',
	//   mobile:  'MobileIntro',
	// });

	// ─── Register components ─────────────────────────────────────────────
	UIManager.addComponent(Intro);
	// UIManager.addComponent(MobileIntro);
}
