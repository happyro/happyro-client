import { beforeEach, expect, it, vi } from 'vitest';
const { platform, hud } = vi.hoisted(() => ({ platform: { isMobile: false }, hud: { append: vi.fn(), actions: null } }));
vi.mock('UI/Platform.js', () => ({ default: platform }));
vi.mock('UI/Mobile/game/GameHUD.js', () => ({ default: hud }));
import { appendGameComponent, appendGameHUD } from '../../src/UI/Game/GamePresentation.js';
beforeEach(() => { vi.clearAllMocks(); platform.isMobile = false; });
it('preserves desktop component mounting and does not mount mobile HUD', () => {
	const component = { name: 'BasicInfoV5', prepare: vi.fn(), append: vi.fn() };
	appendGameComponent(component); appendGameHUD({});
	expect(component.append).toHaveBeenCalledOnce(); expect(component.prepare).not.toHaveBeenCalled();
	expect(hud.append).not.toHaveBeenCalled();
});
it('prepares legacy data bindings without displaying desktop panels on mobile', () => {
	platform.isMobile = true;
	const component = { name: 'BasicInfoV5', prepare: vi.fn(), append: vi.fn() };
	appendGameComponent(component); appendGameHUD({ sendChat: 'callback' });
	expect(component.prepare).toHaveBeenCalledOnce(); expect(component.append).not.toHaveBeenCalled();
	expect(hud.actions.sendChat).toBe('callback'); expect(hud.append).toHaveBeenCalledOnce();
});
it('retains physical gamepad support on mobile', () => {
	platform.isMobile = true;
	const component = { name: 'JoystickUI', prepare: vi.fn(), append: vi.fn() };
	appendGameComponent(component); expect(component.append).toHaveBeenCalledOnce();
});
