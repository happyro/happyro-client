import { afterEach, expect, it, vi } from 'vitest';
import { createMaterialsPanel } from '../../src/UI/Mobile/game/MaterialsPanel.js';
import { createRefinementPanel } from '../../src/UI/Mobile/game/RefinementPanel.js';
import { createEnchantPanel } from '../../src/UI/Mobile/game/EnchantPanel.js';
import { createSelectionPanel } from '../../src/UI/Mobile/game/SelectionPanel.js';
import { createTradePanel } from '../../src/UI/Mobile/game/TradePanel.js';
import { createVendingPanel } from '../../src/UI/Mobile/game/VendingPanel.js';
import { createContainerPanel } from '../../src/UI/Mobile/game/ContainerPanel.js';
const mount = () => document.body.appendChild(document.createElement('div'));
const item = {
	index: 1,
	ID: 501,
	id: 1,
	identity: 'one',
	name: '红色药水',
	count: 20,
	description: '说明',
	quantity: 2,
	price: 10
};
const button = (body, text) => [...body.querySelectorAll('button')].find(b => b.textContent === text);
const input = (field, value) => {
	field.value = value;
	field.dispatchEvent(new Event('input', { bubbles: true }));
};
afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
});
it('preserves material drafts during refresh, blocks unreviewed edits, and rejects changed orders', () => {
	const body = mount(),
		state = {
			items: [item, { ...item, index: 2 }],
			order: [{ ...item, count: 2, description: '改造结果' }],
			allowed: true
		};
	const service = { snapshot: () => state, set: vi.fn(() => ''), clear: vi.fn(), confirm: vi.fn() };
	const panel = createMaterialsPanel(body, service);
	body.querySelector('.inventory-item').click();
	const field = body.querySelector('input');
	input(field, '3');
	state.items[0] = { ...item, count: 10 };
	panel.update();
	expect(body.querySelector('input')).toBe(field);
	expect(field.max).toBe('10');
	body.querySelectorAll('.inventory-item')[1].click();
	expect(body.querySelector('input')).toBe(field);
	button(body, '核对材料').click();
	expect(body.querySelector('dialog')).toBeNull();
	button(body, '撤销修改').click();
	button(body, '核对材料').click();
	expect(body.querySelector('dialog').textContent).toContain('改造结果');
	state.order = [];
	body.querySelector('[data-confirm]').click();
	expect(service.confirm).not.toHaveBeenCalled();
	state.allowed = false;
	panel.update();
	expect(field.disabled).toBe(true);
});
it('keeps refinement material and optional protection through refresh without requiring protection', () => {
	const body = mount(),
		state = {
			items: [item],
			selected: { index: 1, ID: 501 },
			allowed: true,
			kind: 'refine',
			offer: { blacksmithBlessing: 2 },
			zeny: 2000,
			materials: [
				{ index: 0, name: '普通矿石', owned: 3, zeny: 100, chance: 70 },
				{ index: 1, name: '高级矿石', owned: 4, zeny: 1000, chance: 90 }
			]
		};
	const service = { snapshot: () => state, confirm: vi.fn(() => ''), select: vi.fn() };
	const panel = createRefinementPanel(body, service);
	body.querySelector('select').value = '1';
	body.querySelector('input').checked = true;
	state.zeny = 3000;
	panel.update();
	expect(body.querySelector('select').value).toBe('1');
	expect(body.querySelector('input').checked).toBe(true);
	body.querySelector('input').checked = false;
	button(body, '核对强化').click();
	expect(body.querySelector('dialog').textContent).toContain('1000 Zeny');
	body.querySelector('[data-confirm]').click();
	expect(service.confirm).toHaveBeenCalledWith(1, 0);
	button(body, '核对强化').click();
	state.materials[1].zeny = 2000;
	body.querySelector('[data-confirm]').click();
	expect(service.confirm).toHaveBeenCalledTimes(1);
});
it('keeps enchant choice for current equipment but clears it when equipment changes', () => {
	const body = mount(),
		state = {
			items: [item],
			selected: { index: 1, ID: 501 },
			allowed: true,
			choices: [{ key: 'a', name: '附魔', rate: 100000, zeny: 100, materials: [], results: ['力量 + 3'] }]
		};
	const panel = createEnchantPanel(body, { snapshot: () => state, confirm: vi.fn() });
	let select = body.querySelector('select');
	select.value = 'a';
	select.dispatchEvent(new Event('change'));
	state.allowed = false;
	panel.update();
	expect(body.querySelector('select').value).toBe('a');
	expect(body.querySelector('select').disabled).toBe(true);
	state.allowed = true;
	state.selected = { index: 2, ID: 502 };
	panel.update();
	expect(body.querySelector('select').value).toBe('');
});
it('preserves smithing materials only for the same recipe and refreshes material availability', () => {
	const body = mount(),
		state = {
			entries: [
				{ id: 1, name: '武器一', materials: true },
				{ id: 2, name: '武器二', materials: true }
			],
			materials: [{ id: 1000, name: '材料', count: 3 }],
			allowed: true
		};
	const panel = createSelectionPanel(body, { snapshot: () => state, choose: vi.fn() });
	body.querySelector('.inventory-item').click();
	body.querySelector('select').value = '1000';
	state.materials[0].count = 2;
	panel.update();
	expect(body.querySelector('select').value).toBe('1000');
	expect(body.querySelector('select').textContent).toContain('× 2');
	body.querySelectorAll('.inventory-item')[1].click();
	expect(body.querySelector('select').value).toBe('0');
});
it('blocks trade locking with unapplied money and quantity, then reviews both sides', () => {
	const body = mount(),
		state = {
			items: [item],
			money: 0,
			peerMoney: 20,
			balance: 1000,
			allowed: true,
			pending: false,
			ownLocked: false,
			peerLocked: false,
			offered: [{ ...item, count: 2 }],
			received: [{ ...item, name: '蓝色药水', count: 3 }],
			status: '交易'
		};
	const service = {
		snapshot: () => state,
		lock: vi.fn(),
		execute: vi.fn(),
		setMoney: vi.fn(),
		add: vi.fn(),
		cancel: vi.fn()
	};
	const panel = createTradePanel(body, service);
	input(body.querySelector('[data-money]'), '50');
	body.querySelector('[data-lock]').click();
	expect(service.lock).not.toHaveBeenCalled();
	body.querySelector('[data-revert-money]').click();
	body.querySelector('.inventory-item').click();
	const quantity = body.querySelector('[aria-label="交易数量"]');
	input(quantity, '5');
	panel.update();
	body.querySelector('[data-lock]').click();
	expect(service.lock).not.toHaveBeenCalled();
	expect(quantity.value).toBe('5');
	body.querySelector('[data-revert-quantity]').click();
	body.querySelector('[data-lock]').click();
	expect(service.lock).toHaveBeenCalledOnce();
	state.ownLocked = state.peerLocked = true;
	panel.update();
	body.querySelector('[data-execute]').click();
	expect(body.querySelector('dialog').textContent).toContain('蓝色药水 × 3');
	state.peerMoney = 30;
	body.querySelector('[data-confirm]').click();
	expect(service.execute).not.toHaveBeenCalled();
});
it('preserves vending price drafts and requires saving before opening a store', () => {
	const body = mount(),
		state = {
			items: [item],
			order: [{ ...item, count: 2 }],
			allowed: true,
			mode: 'sell',
			slots: 10,
			total: 20,
			money: 1000
		};
	const service = { snapshot: () => state, set: vi.fn(() => ''), submit: vi.fn(), close: vi.fn() };
	const panel = createVendingPanel(body, service);
	body.querySelector('[data-title]').value = '商店';
	body.querySelector('.inventory-item').click();
	const price = body.querySelector('[aria-label="单价"]');
	input(price, '30');
	state.items[0] = { ...item, count: 10 };
	panel.update();
	expect(body.querySelector('[aria-label="单价"]')).toBe(price);
	body.querySelector('[data-submit]').click();
	expect(body.querySelector('dialog')).toBeNull();
	button(body, '保存数量与单价').click();
	expect(service.set).toHaveBeenCalledWith(1, 'one', 2, 30);
	body.querySelector('[data-submit]').click();
	expect(body.querySelector('.interaction-review-summary').textContent).toContain('20 Zeny');
});
it('updates transfer limits and destinations without discarding quantity edits', () => {
	const body = mount(),
		state = {
			items: [item],
			containers: ['inventory', 'storage', 'cart'],
			allowed: true,
			storageCapacity: { current: 1, limit: 600 },
			capacity: { current: 1, limit: 100 }
		};
	const service = { snapshot: () => state, transfer: vi.fn() };
	const panel = createContainerPanel(body, service, 'storage');
	body.querySelector('.inventory-item').click();
	const field = body.querySelector('[aria-label="转移数量"]');
	input(field, '15');
	state.items[0] = { ...item, count: 10 };
	state.containers = ['storage', 'cart'];
	panel.update();
	expect(field.value).toBe('15');
	expect(field.max).toBe('10');
	expect(body.querySelector('.inventory-detail select').value).toBe('cart');
	button(body, '确认转移').click();
	expect(service.transfer).not.toHaveBeenCalled();
	button(body, '全部数量').click();
	button(body, '确认转移').click();
	expect(service.transfer).toHaveBeenCalledWith('storage', 'cart', 1, 501, 10, item.identity);
	state.allowed = false;
	panel.update();
	expect(button(body, '确认转移').disabled).toBe(true);
});

it('rejects an enchant confirmation when the selected equipment changed', () => {
	const body = mount(),
		state = {
			items: [item],
			selected: { index: 1, ID: 501 },
			allowed: true,
			choices: [{ key: 'a', name: '附魔', rate: 100000, zeny: 100, materials: [], results: [] }]
		};
	const service = { snapshot: () => state, confirm: vi.fn() };
	createEnchantPanel(body, service);
	const select = body.querySelector('select');
	select.value = 'a';
	select.dispatchEvent(new Event('change'));
	button(body, '核对附魔').click();
	state.selected = { index: 2, ID: 502 };
	body.querySelector('[data-confirm]').click();
	expect(service.confirm).not.toHaveBeenCalled();
});

it('filters warehouse selection and separates deposits from withdrawals', () => {
 const body = mount();
 const state = {items:[{...item,identity:'a',name:'红色药水',category:'usable'}],containers:['inventory','storage','cart'],allowed:true,capacity:{current:1,limit:600}};
 const service = {snapshot:vi.fn(() => state),transfer:vi.fn()};
 const panel = createContainerPanel(body,service,'storage');
 body.querySelector('.inventory-item').click();
 expect(body.querySelector('.inventory-item').getAttribute('aria-pressed')).toBe('true');
 input(body.querySelector('[type=search]'),'不存在');
 expect(body.querySelector('.inventory-item')).toBeNull();
 expect(body.querySelector('.inventory-detail input')).toBeNull();
 expect(body.querySelector('.container-empty').textContent).toContain('没有符合');
 input(body.querySelector('[type=search]'),'501');
 button(body,'存入').click();
 expect(service.snapshot).toHaveBeenCalledWith('inventory');
 body.querySelector('.inventory-item').click();
 expect([...body.querySelector('.inventory-detail select').options].map(o=>o.value)).toEqual(['storage']);
 state.pending=true; panel.update();
 expect(button(body,'确认转移').disabled).toBe(true);
 state.pending=false; state.items[0].identity='b'; panel.update();
 expect(body.querySelector('.inventory-detail input')).toBeNull();
});
