import { expect, it, vi } from 'vitest';
vi.mock('Renderer/Camera.js', () => ({ default: {} }));
vi.mock('Core/Client.js', () => ({ default: {} }));
vi.mock('Renderer/SpriteRenderer.js', () => ({ default: {} }));
vi.mock('Renderer/Map/Ground.js', () => ({ default: {} }));
vi.mock('Renderer/Map/Altitude.js', () => ({ default: {} }));
vi.mock('Engine/SessionStorage.js', () => ({ default: {} }));
vi.mock('DB/DBManager.js', () => ({ default: {} }));
vi.mock('Preferences/Graphics.js', () => ({ default: {} }));
vi.mock('Renderer/GR2/GR2ModelRenderer.js', () => ({ default: {} }));
import { calcAnimation } from '../../src/Renderer/Entity/EntityRender.js';

it('keeps later sprite layers on a valid first frame when an action starts inside the same render pass', () => {
	const action = { animations: [{ layers: [] }, { layers: [] }, { layers: [] }], delay: 40 };
	const entity = {
		ACTION: { IDLE: 0, SIT: 1, WALK: 2, ATTACK1: 3 }, action: 3,
		animation: { repeat: true, play: true, frame: 0 }, attack_speed: 120,
		sound: { freeOnAnimationEnd: vi.fn() }
	};
	// The body switches action at t=1005; the weapon still uses the shared t=1000 frame tick.
	expect(action.animations[calcAnimation(entity, action, 'weapon', 1000 - 1005)]).toBe(action.animations[0]);
	expect(calcAnimation(entity, action, 'weapon', 40)).toBe(1);
	expect(calcAnimation(entity, action, 'weapon', 120)).toBe(0);
});
