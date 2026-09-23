import { expect, it, vi } from 'vitest';
import { createShortcutPanel } from '../../src/UI/Mobile/game/ShortcutPanel.js';
it('loads icons without replacing the selected level and saves/clears by tapping', () => {
	const body = document.createElement('div');
	const entry = { isSkill: true, ID: 1, level: 5, name: '测试技能', amount: 'Lv.5', icon: '' };
	const actions = {
		snapshot: () => ({
			slots: [
				{ index: 3, name: '空槽位' },
				{ index: 4, name: '空槽位' },
				{ index: 5, name: '空槽位' }
			]
		}),
		candidates: () => [entry],
		configure: vi.fn(() => true),
		saved: vi.fn()
	};
	const panel = createShortcutPanel(body, actions);
	body.querySelector('.shortcut-choice').click();
	const select = body.querySelector('select');
	select.value = '2';
	panel.updateIcons([{ ...entry, icon: 'data:image/png;base64,AA==' }]);
	expect(select.value).toBe('2');
	expect(body.querySelector('img').src).toContain('data:image');
	body.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
	expect(actions.configure).toHaveBeenCalledWith(3, entry, 2);
	body.querySelector('[data-index="4"]').click();
	body.querySelector('[data-clear-slot]').click();
	expect(actions.configure).toHaveBeenLastCalledWith(4, null);
});
