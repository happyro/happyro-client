import { expect, it, vi } from 'vitest';
import { createAutoCombatPanel } from '../../src/UI/Game/AutoCombatPanel.js';
it('keeps configured species when it is absent nearby and saves multiple skills independently of shortcuts', () => {
	const body = document.createElement('div');
	const actions = { snapshot: () => ({ species: [{ id: 1002, name: '波利' }], skills: [5], ranges: { search: 20, activity: 30 } }), targets: () => [{ species: 1003, name: '土波利' }], skills: () => [{ id: 5, name: '狂击', level: 3 }, { id: 19, name: '火箭术', level: 2, reason: 'SP 不足' }], configure: vi.fn(), close: vi.fn() };
	createAutoCombatPanel(body, actions);
	expect(body.querySelector('[data-species="1002"]').getAttribute('aria-checked')).toBe('true');
	body.querySelector('[data-species="1003"]').click();
	expect(body.querySelector('[data-species="1002"]').getAttribute('aria-checked')).toBe('true');
	expect(body.querySelector('[data-species="1003"]').getAttribute('aria-checked')).toBe('true');
	body.querySelector('input[value="19"]').checked = true;
	body.querySelector('[data-save-auto]').click();
	expect(actions.configure).toHaveBeenLastCalledWith([{ id: 1002, name: '波利' }, { id: 1003, name: '土波利' }], [5, 19], { search: 20, activity: 30 });
	expect(actions.close).toHaveBeenCalledOnce();
	expect(body.querySelector('[data-pick-species]')).toBeNull();
	body.querySelector('[data-all-species]').click(); body.querySelector('[data-save-auto]').click();
	expect(actions.configure).toHaveBeenLastCalledWith([], [5, 19], { search: 20, activity: 30 }); expect(actions.close).toHaveBeenCalledTimes(2);
});
