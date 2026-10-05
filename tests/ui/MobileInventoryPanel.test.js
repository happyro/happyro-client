import { expect, it, vi } from 'vitest';
import { createInventoryPanel } from '../../src/UI/Mobile/game/InventoryPanel.js';
it('supports category dropdowns, exact-index actions, live server updates and shortcut confirmation without losing selection', () => {
 const body = document.body.appendChild(document.createElement('div'));
 let items = [{ index: 2, ID: 501, name: '药水', count: 3, category: 'usable', description: '<img onerror=alert(1)>', action: 'use', reason: '', identified: true, shortcut: true }, { index: 3, ID: 1201, name: '短剑', count: 1, category: 'equipment', action: 'equip', reason: '', identified: true, shortcut: true }];
 const actions = { snapshot: () => items, act: vi.fn(() => ''), bind: vi.fn(() => true), shortcuts: () => ({ page: 1, pages: 8, total: 36, slots: [{ index: 5 }] }), slotName: () => '旧技能' };
 const panel = createInventoryPanel(body, actions);
 const category = value => { const select = body.querySelector('[aria-label="背包分类"]'); select.value = value; select.dispatchEvent(new Event('change')); };
 const click = text => [...body.querySelectorAll('button')].find(b => b.textContent === text).click();
 body.querySelector('[data-index="2"]').click(); expect(body.querySelector('.item-description img')).toBeNull(); click('使用'); expect(actions.act).not.toHaveBeenCalled(); body.querySelector('dialog [data-confirm]').click(); expect(actions.act).toHaveBeenCalledExactlyOnceWith(2, 501, 'use');
 const original = body.querySelector('[data-index="2"]'); items[0].count = 2; panel.update(); expect(body.querySelector('[data-index="2"]')).toBe(original); expect(original.textContent).toContain('×2');
 expect(body.querySelector('.inventory-detail').lastElementChild.className).toBe('inventory-actions');
 const description = body.querySelector('.item-description');
 click('设置快捷槽'); expect(body.querySelector('.item-description')).toBe(description); expect(body.querySelector('dialog').open).toBe(true); expect(body.querySelector('[aria-label="槽位"]').value).toBe('5'); body.querySelector('[aria-label="槽位"]').value = '35'; panel.update(); expect(body.querySelector('[aria-label="槽位"]').value).toBe('35'); click('确认'); expect(actions.bind).toHaveBeenCalledExactlyOnceWith(2, 501, 35);
 category('equipment'); expect(body.querySelector('[data-index="2"]')).toBeNull(); body.querySelector('[data-index="3"]').click(); click('穿戴'); expect(body.querySelector('dialog')).toBeNull(); expect(actions.act).toHaveBeenLastCalledWith(3, 1201, 'equip');
 items[1] = { ...items[1], worn: true, action: 'unequip', shortcut: false }; panel.update(); category('worn'); click('卸下'); expect(body.querySelector('dialog')).toBeNull(); expect(actions.act).toHaveBeenLastCalledWith(3, 1201, 'unequip');
 items = []; panel.update(); expect(body.textContent).toContain('暂无物品'); expect(body.querySelector('.inventory-detail').textContent).toContain('点击物品');
});

it('adjusts discard quantity within the stack and packet limits before confirming', () => {
 const body = document.body.appendChild(document.createElement('div'));
 const item = { index: 2, ID: 501, name: '药水', count: 70000, category: 'usable', identified: true };
 const actions = { snapshot: () => [item], drop: vi.fn(() => '') };
 createInventoryPanel(body, actions);
 body.querySelector('[data-index="2"]').click();
 [...body.querySelectorAll('button')].find(b => b.textContent === '丢弃').click();
 const quantity = body.querySelector('[aria-label="丢弃数量"]');
 const press = label => body.querySelector(`[aria-label="${label}"]`).click();
 press('减少数量'); expect(quantity.value).toBe('1');
 press('增加数量'); expect(quantity.value).toBe('2');
 press('最大数量'); expect(quantity.value).toBe('65535');
 press('增加数量'); expect(quantity.value).toBe('65535');
 quantity.value = ''; press('增加数量'); expect(quantity.value).toBe('2');
 quantity.value = '8'; press('减少数量'); expect(quantity.value).toBe('7');
 body.querySelector('[data-confirm]').click();
 expect(actions.drop).toHaveBeenCalledExactlyOnceWith(2, 501, 7);
});
