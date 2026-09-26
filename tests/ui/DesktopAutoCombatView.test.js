import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createAutoCombatView } from '../../src/UI/Components/AutoCombat/AutoCombatView.js';
let view, root, state, actions;
beforeEach(() => {
	const host = document.createElement('div'); document.body.append(host);
	root = host.attachShadow({ mode: 'open' });
	state = { active: false, status: '自动战斗已停止', species: [], skills: [], ranges: { search: 20, activity: 30 } };
	actions = {
		snapshot: () => state,
		start: vi.fn(() => { state.active = true; state.status = '寻找附近目标'; return true; }),
		stop: vi.fn(message => { state.active = false; state.status = message || '自动战斗已停止'; }),
		targets: () => [{ species: 1002, name: '波利' }],
		skills: () => [{ id: 5, name: '狂击', level: 3 }], configure: vi.fn(() => true)
	};
	view = createAutoCombatView(root, actions);
});
afterEach(() => { view.destroy(); document.body.replaceChildren(); });
const click = selector => root.querySelector(selector).click();
it('offers a visible start/stop control with live status and accessible state', () => {
	click('[data-toggle]'); expect(actions.start).toHaveBeenCalledOnce();
	expect(root.querySelector('[data-toggle]').getAttribute('aria-pressed')).toBe('true');
	expect(root.querySelector('[data-status]').textContent).toBe('寻找附近目标');
	click('[data-toggle]'); expect(actions.stop).toHaveBeenCalledOnce();
	expect(root.querySelector('[data-toggle]').textContent).toBe('自动战斗');
});
it('uses the shared species, skill and range editor and saves without starting combat', () => {
	click('[data-settings]'); expect(view.isOpen()).toBe(true); expect(actions.stop).toHaveBeenCalledOnce();
	click('[data-species="1002"]'); root.querySelector('input[value="5"]').checked = true;
	click('[data-range="search"][data-delta="1"]'); click('[data-save-auto]');
	expect(actions.configure).toHaveBeenCalledExactlyOnceWith([{ id: 1002, name: '波利' }], [5], { search: 21, activity: 30 });
	expect(view.isOpen()).toBe(false); expect(actions.start).not.toHaveBeenCalled();
	expect(root.activeElement).toBe(root.querySelector('[data-settings]'));
});
it('cancels unsaved settings with Escape and keeps keyboard focus inside the dialog', () => {
	click('[data-settings]');
	root.querySelector('[data-close]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
	expect(root.activeElement).toBe(root.querySelector('[data-save-auto]'));
	root.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
	expect(view.isOpen()).toBe(false); expect(actions.configure).not.toHaveBeenCalled();
});
it('reports a rejected start and retains unsaved settings after persistence failure', () => {
	actions.start.mockReturnValue(false); click('[data-toggle]');
	expect(root.querySelector('[data-status]').textContent).toBe('当前不能开始自动战斗');
	click('[data-settings]'); actions.configure.mockReturnValue(false); click('[data-save-auto]');
	expect(view.isOpen()).toBe(true); expect(root.querySelector('[data-auto-feedback]').textContent).toContain('保存失败');
});

it('does not forward dialog keystrokes to gameplay shortcuts', () => {
	const gameplay = vi.fn();
	window.addEventListener('keydown', gameplay);
	try {
		click('[data-settings]');
		root.querySelector('[data-close]').dispatchEvent(new KeyboardEvent('keydown', { key: 'F1', bubbles: true, composed: true }));
		expect(gameplay).not.toHaveBeenCalled();
	} finally { window.removeEventListener('keydown', gameplay); }
});
