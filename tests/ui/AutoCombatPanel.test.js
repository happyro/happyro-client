import { expect, it, vi } from 'vitest';
import { createAutoCombatPanel } from '../../src/UI/Mobile/game/AutoCombatPanel.js';
it('keeps configured species when it is absent nearby and saves multiple skills independently of shortcuts', () => {
	const body = document.createElement('div');
	const actions = { snapshot: () => ({ species: { id: 1002, name: '波利' }, skills: [5] }), targets: () => [{ species: 1003, name: '土波利' }], skills: () => [{ id: 5, name: '狂击', level: 3 }, { id: 19, name: '火箭术', level: 2, reason: 'SP 不足' }], configure: vi.fn(), close: vi.fn(), pickSpecies: vi.fn() };
	createAutoCombatPanel(body, actions);
	expect(body.querySelector('select').value).toBe('1002');
	body.querySelector('input[value="19"]').checked = true;
	body.querySelector('[data-save-auto]').click();
	expect(actions.configure).toHaveBeenLastCalledWith({ id: 1002, name: '波利' }, [5, 19]);
	body.querySelector('select').value = 'all'; body.querySelector('[data-pick-species]').click();
	expect(actions.configure).toHaveBeenLastCalledWith(null, [5, 19]); expect(actions.pickSpecies).toHaveBeenCalledOnce(); expect(actions.close).toHaveBeenCalledTimes(2);
});
