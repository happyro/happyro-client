import Platform from 'UI/Platform.js';
import MobileGameHUD from 'UI/Mobile/game/GameHUD.js';

/** Keep map/network initialization common; choose the visible game UI in one place. */
export function appendGameComponent(component) {
	if (Platform.isMobile && component.name !== 'JoystickUI') {
		// Legacy packet handlers still use these models until their phase is migrated.
		component.prepare();
		return;
	}
	component.append();
}
export function appendGameHUD(actions) {
	if (!Platform.isMobile) return;
	MobileGameHUD.actions = actions;
	MobileGameHUD.append();
}
