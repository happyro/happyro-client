import { beforeEach, expect, it, vi } from 'vitest';
import { createShortcutPanel } from '../../src/UI/Mobile/game/ShortcutPanel.js';
let body, entry, item, slots, actions, panel;
beforeEach(() => {
 body = document.createElement('div');
 entry = { isSkill: true, ID: 1, level: 5, name: '测试技能', amount: 'Lv.5', icon: '' };
 item = { isSkill: false, ID: 501, name: '红色药水', amount: 3 };
 slots = [{ index: 3, name: '空槽位', empty: true }, { index: 4, name: '测试技能', empty: false, binding: { isSkill: true, ID: 1, count: 3 } }];
 actions = { snapshot: () => ({ slots }), candidates: () => [entry, item], configure: vi.fn((index, choice, level) => {
  const slot = slots.find(s => s.index === index);slot.empty = !choice;slot.name = choice?.name || '空槽位';slot.binding = choice ? { isSkill: choice.isSkill, ID: choice.ID, count: level } : null;return true;
 }) };
 panel = createShortcutPanel(body, actions);
});
it('preserves chosen level and list position while icons load, then saves without closing the editor', () => {
 body.querySelector('.shortcut-choices').scrollTop = 100;
 body.querySelector('.shortcut-choice').click(); const select = body.querySelector('select'); select.value = '2';
 panel.updateIcons([{ ...entry, icon: 'data:image/png;base64,AA==' }, item]);
 expect(select.value).toBe('2');expect(body.querySelector('img').src).toContain('data:image');
 expect(body.querySelector('.shortcut-choices').scrollTop).toBe(100);
 body.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
 expect(actions.configure).toHaveBeenCalledWith(3, entry, 2);
 expect(body.querySelector('[data-current]').textContent).toContain(entry.name);
 expect(body.querySelector('[data-config-status]').textContent).toContain('已保存');
 expect(body.querySelector('form').hidden).toBe(false);
});
it('disables clearing empty slots, confirms occupied ones and allows cancelling', () => {
 expect(body.querySelector('[data-clear-slot]').disabled).toBe(true);
 body.querySelector('[data-index="4"]').click();body.querySelector('[data-clear-slot]').click();
 expect(actions.configure).not.toHaveBeenCalled();expect(body.querySelector('[data-clear-question]').textContent).toContain('槽位 5');
 body.querySelector('[data-cancel-clear]').click();expect(body.querySelector('[data-clear-confirm]').hidden).toBe(true);
 body.querySelector('[data-clear-slot]').click();body.querySelector('[data-confirm-clear]').click();
 expect(actions.configure).toHaveBeenCalledExactlyOnceWith(4, null);
 expect(body.querySelector('[data-clear-slot]').disabled).toBe(true);
});
it('switching slots cancels the pending edit and clear confirmation', () => {
 body.querySelector('[data-index="4"]').click();body.querySelector('[data-clear-slot]').click();
 body.querySelector('[data-index="3"]').click();expect(body.querySelector('[data-clear-confirm]').hidden).toBe(true);
 expect(body.querySelector('form').hidden).toBe(true);expect(actions.configure).not.toHaveBeenCalled();
});
it('editing an existing skill starts at the bound level and items hide the level selector', () => {
 body.querySelector('[data-index="4"]').click();body.querySelector('.shortcut-choice').click();
 expect(body.querySelector('select').value).toBe('3');
 body.querySelector('[data-key="false:501"]').click();expect(body.querySelector('.shortcut-level').hidden).toBe(true);
 expect(body.querySelectorAll('.shortcut-choice[aria-pressed="true"]')).toHaveLength(1);
 body.querySelector('[data-cancel-choice]').click();expect(body.querySelector('form').hidden).toBe(true);
});
it('failed saves keep the draft and selected level for correction', () => {
 actions.configure.mockReturnValue(false);body.querySelector('.shortcut-choice').click();body.querySelector('select').value = '2';
 body.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
 expect(body.querySelector('[data-config-status]').textContent).toContain('保存失败');
 expect(body.querySelector('select').value).toBe('2');expect(body.querySelector('form').hidden).toBe(false);
});
