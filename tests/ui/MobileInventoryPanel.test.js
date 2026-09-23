import { expect, it, vi } from 'vitest';
import { createInventoryPanel } from '../../src/UI/Mobile/game/InventoryPanel.js';
it('supports tap categories, exact-index actions, live server updates and shortcut confirmation without losing selection', () => {
 const body = document.createElement('div');
 let items = [{ index: 2, ID: 501, name: '药水', count: 3, category: 'usable', description: '<img onerror=alert(1)>', action: 'use', reason: '', identified: true, shortcut: true }, { index: 3, ID: 1201, name: '短剑', count: 1, category: 'equipment', action: 'equip', reason: '', identified: true, shortcut: true }];
 const actions = { snapshot: () => items, act: vi.fn(() => '已发送'), bind: vi.fn(() => true), shortcuts: () => ({ page: 1, pages: 12 }), slotName: () => '旧技能' };
 const panel = createInventoryPanel(body, actions);
 const click = text => [...body.querySelectorAll('button')].find(b => b.textContent === text).click();
 body.querySelector('[data-index="2"]').click(); expect(body.querySelector('.item-description img')).toBeNull(); click('使用'); expect(actions.act).toHaveBeenCalledExactlyOnceWith(2, 501, 'use');
 const original = body.querySelector('[data-index="2"]'); items[0].count = 2; panel.update(); expect(body.querySelector('[data-index="2"]')).toBe(original); expect(original.textContent).toContain('×2');
 click('设置快捷槽'); expect(body.querySelector('[aria-label="目标快捷槽"]').value).toBe('3'); body.querySelector('[aria-label="目标快捷槽"]').value = '35'; panel.update(); expect(body.querySelector('[aria-label="目标快捷槽"]').value).toBe('35'); click('确认设置'); expect(actions.bind).toHaveBeenCalledExactlyOnceWith(2, 501, 35);
 click('装备'); expect(body.querySelector('[data-index="2"]')).toBeNull(); body.querySelector('[data-index="3"]').click(); click('穿戴'); expect(actions.act).toHaveBeenLastCalledWith(3, 1201, 'equip');
 items[1] = { ...items[1], worn: true, action: 'unequip', shortcut: false }; panel.update(); click('已穿戴'); click('卸下'); expect(actions.act).toHaveBeenLastCalledWith(3, 1201, 'unequip');
 items = []; panel.update(); expect(body.textContent).toContain('暂无物品'); expect(body.querySelector('.inventory-detail').textContent).toContain('点击物品');
});
