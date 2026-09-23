import { afterEach, expect, it, vi } from 'vitest';
import { bindPointerControls } from '../../src/UI/Mobile/game/PointerControls.js';
let controls;
afterEach(() => {
	controls?.destroy();
	vi.useRealTimers();
});
function setup() {
	vi.useFakeTimers();
	const root = document.createElement('div');
	root.innerHTML =
		'<div class="joystick"><span></span></div><button class="attack"></button><button data-shortcut="0"></button>';
	const scene = document.createElement('canvas'),
		stick = root.firstChild,
		attack = root.querySelector('.attack'),
		skill = root.querySelector('[data-shortcut]');
	for (const node of [stick, attack, scene, skill]) {
		const captures = new Set();
		node.setPointerCapture = id => captures.add(id);
		node.hasPointerCapture = id => captures.has(id);
		node.releasePointerCapture = id => captures.delete(id);
	}
	stick.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 });
	skill.getBoundingClientRect = () => ({ left: 0, right: 100, top: 0, bottom: 100 });
	const actions = Object.fromEntries(
		['shortcut', 'move', 'stopMove', 'attack', 'stopAttack', 'tap'].map(k => [k, vi.fn()])
	);
	actions.enabled = vi.fn(() => true);
	controls = bindPointerControls(root, scene, actions);
	const fire = (node, type, id, x = 80, y = 50) => {
		const event = new Event(type, { bubbles: true, cancelable: true });
		Object.assign(event, { pointerId: id, clientX: x, clientY: y, button: 0 });
		node.dispatchEvent(event);
	};
	return { root, scene, stick, attack, skill, actions, fire };
}
it('tracks two fingers independently and ignores an unrelated pointer release', () => {
	const { stick, attack, actions, fire } = setup();
	fire(stick, 'pointerdown', 1);
	fire(attack, 'pointerdown', 2);
	expect(actions.attack).toHaveBeenCalledWith(true);
	fire(stick, 'pointerup', 2);
	fire(attack, 'pointerup', 2);
	const count = actions.move.mock.calls.length;
	vi.advanceTimersByTime(400);
	expect(actions.move.mock.calls.length).toBeGreaterThan(count);
	expect(actions.stopAttack).toHaveBeenCalledTimes(1);
	fire(stick, 'pointerup', 1);
	const end = actions.move.mock.calls.length;
	vi.advanceTimersByTime(1000);
	expect(actions.move).toHaveBeenCalledTimes(end);
	expect(vi.getTimerCount()).toBe(0);
});
it('cancels capture, movement and held attack on cancellation or loss of capture', () => {
	const { stick, attack, actions, fire } = setup();
	fire(stick, 'pointerdown', 1);
	fire(attack, 'pointerdown', 2);
	fire(stick, 'lostpointercapture', 1);
	expect(actions.stopAttack).not.toHaveBeenCalled();
	fire(attack, 'pointercancel', 2);
	expect(actions.stopAttack).toHaveBeenCalledTimes(1);
	expect(vi.getTimerCount()).toBe(0);
});
it('stops both controls when a modal or death blocks input', () => {
	const { stick, attack, actions, fire } = setup();
	fire(stick, 'pointerdown', 1);
	fire(attack, 'pointerdown', 2);
	actions.enabled.mockReturnValue(false);
	vi.advanceTimersByTime(200);
	expect(actions.stopAttack).toHaveBeenCalledTimes(1);
	expect(stick.hasPointerCapture(1)).toBe(false);
	expect(vi.getTimerCount()).toBe(0);
});
it('only taps the scene without a held control or a drag and removes all listeners', () => {
	const { scene, stick, actions, fire } = setup();
	fire(scene, 'pointerdown', 3);
	fire(scene, 'pointerup', 3);
	expect(actions.tap).toHaveBeenCalledTimes(1);
	fire(stick, 'pointerdown', 1);
	fire(scene, 'pointerdown', 3);
	fire(scene, 'pointerup', 3);
	expect(actions.tap).toHaveBeenCalledTimes(1);
	controls.cancel();
	fire(scene, 'pointerdown', 3);
	fire(scene, 'pointermove', 3, 150);
	fire(scene, 'pointerup', 3, 150);
	expect(actions.tap).toHaveBeenCalledTimes(1);
	controls.destroy();
	fire(stick, 'pointerdown', 4);
	expect(vi.getTimerCount()).toBe(0);
});

it('activates one skill on its own release without stopping the joystick, and ignores cancelled/outside releases', () => {
	const { stick, skill, actions, fire } = setup();
	fire(stick, 'pointerdown', 1);
	fire(skill, 'pointerdown', 2);
	fire(skill, 'pointerup', 2);
	expect(actions.shortcut).toHaveBeenCalledExactlyOnceWith(0);
	const count = actions.move.mock.calls.length;
	vi.advanceTimersByTime(400);
	expect(actions.move.mock.calls.length).toBeGreaterThan(count);
	fire(skill, 'pointerdown', 2);
	fire(skill, 'pointercancel', 2);
	fire(skill, 'pointerdown', 3);
	fire(skill, 'pointerup', 3, 120, 120);
	expect(actions.shortcut).toHaveBeenCalledTimes(1);
	controls.cancel();
	expect(vi.getTimerCount()).toBe(0);
});
