import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameHUDView } from '../../src/UI/Mobile/game/GameHUDView.js';
import { clearChatFeed, publishChatMessage, subscribeChatFeed } from '../../src/UI/Game/ChatFeed.js';

let host, root, view, actions;
const state = { name: '测试角色', job: '初心者', level: 10, jobLevel: 5, money: 123, hp: 80, maxHp: 100, sp: 20, maxSp: 40, position: [12, 34], mapName: '普隆德拉', statuses: [{ id: 1, title: '加速术', description: '10秒', icon: 'data:image/png;base64,AA==' }] };
beforeEach(() => {
	host = document.createElement('div'); document.body.append(host); root = host.attachShadow({ mode: 'open' });
	actions = { openAdventureMap: vi.fn(), equipmentSnapshot: () => ({ slots: [], stats: [] }), inventorySnapshot: () => [], cancelSceneInput: vi.fn(), setModal: vi.fn(), sendChat: vi.fn(), returnToCharacters: vi.fn() };
	view = createGameHUDView(root, actions); view.update(state);
});
afterEach(() => { view.destroy(); host.remove(); clearChatFeed(); vi.restoreAllMocks(); });
const click = selector => root.querySelector(selector).click();

describe('mobile game HUD', () => {
	it('updates live values and details without replacing chat input', () => {
		expect(root.querySelector('[data-hp]').value).toBe(80);
		expect(root.querySelectorAll('[data-status-icons] img')).toHaveLength(1);
		click('[data-panel="profile"]');
		view.update({ ...state, hp: 45 });
		expect(root.querySelector('.panel-body').textContent).toContain('45 / 100');
		click('[data-close]'); click('[data-panel="chat"]');
		const input = root.querySelector('[aria-label="聊天内容"]'); input.value = '正在输入'; input.focus();
		view.update({ ...state, hp: 30 });
		expect(root.querySelector('[aria-label="聊天内容"]')).toBe(input);
		expect(root.activeElement).toBe(input);
		expect(input.value).toBe('正在输入');
	});
	it('blocks touch and mouse propagation while allowing panel clicks', () => {
		const bubble = vi.fn();
		for (const name of ['pointerdown', 'touchstart', 'touchend', 'click']) window.addEventListener(name, bubble);
		try {
			const button = root.querySelector('[data-panel="menu"]');
			for (const name of ['pointerdown', 'touchstart', 'touchend']) button.dispatchEvent(new Event(name, { bubbles: true, composed: true }));
			button.click();
			expect(bubble).not.toHaveBeenCalled();
			expect(actions.cancelSceneInput).toHaveBeenCalledOnce();
			expect(root.querySelector('.backdrop').hidden).toBe(false);
		} finally { for (const name of ['pointerdown', 'touchstart', 'touchend', 'click']) window.removeEventListener(name, bubble); }
	});
	it('renders messages as text, submits once, and releases modal state on removal', () => {
		click('[data-panel="chat"]');
		view.setMessages([{ text: '<img src=x onerror=alert(1)>', channel: 'public' }]);
		expect(root.querySelector('.chat-log img')).toBeNull();
		root.querySelector('[aria-label="聊天内容"]').value = '你好';
		root.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		expect(actions.sendChat).toHaveBeenCalledExactlyOnceWith('你好', 'public', '');
		view.destroy();
		expect(actions.setModal).toHaveBeenLastCalledWith(false);
		expect(root.childElementCount).toBe(0);
	});
	it('provides touch shortcut buttons and provides menu navigation', () => {
		expect([...root.querySelectorAll('.combat .skill')].every(button => !button.disabled)).toBe(true);
		click('[data-panel="menu"]');
		const buttons = [...root.querySelectorAll('.menu-grid button')];
		expect(buttons.find(button => button.textContent === '背包').disabled).toBe(false);
		buttons.find(button => button.textContent === '背包').click();
		expect(root.querySelector('h2').textContent).toBe('背包');
		expect(root.querySelector('.inventory-list').textContent).toContain('暂无物品');
		view.update(state);
		click('[data-close]');
		click('[data-panel="profile"]');
		expect(root.querySelector('h2').textContent).toBe('人物信息');
		root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		expect(root.querySelector('.backdrop').hidden).toBe(true);
	});
});

it('bounds shared chat history and unsubscribes removed views', () => {
	clearChatFeed();
	for (let i = 0; i < 90; i++) publishChatMessage({ text: String(i) });
	const receive = vi.fn(); const unsubscribe = subscribeChatFeed(receive);
	expect(receive.mock.calls[0][0]).toHaveLength(80);
	expect(receive.mock.calls[0][0][0].text).toBe('10');
	unsubscribe(); publishChatMessage({ text: 'later' });
	expect(receive).toHaveBeenCalledOnce();
	clearChatFeed();
	const next = vi.fn(); const stop = subscribeChatFeed(next);
	expect(next).toHaveBeenCalledWith([]); stop();
});

it('does not dismiss a panel from a pre-existing touch release, but accepts a new backdrop tap', () => {
 click('[data-panel="menu"]');
 const backdrop = root.querySelector('.backdrop');
 const pointer = type => { const event = new Event(type, { bubbles: true }); Object.defineProperty(event, 'pointerId', { value: 7 }); backdrop.dispatchEvent(event); };
 pointer('pointerup'); backdrop.click(); expect(backdrop.hidden).toBe(false);
 pointer('pointerdown'); pointer('pointercancel'); backdrop.click(); expect(backdrop.hidden).toBe(false);
 pointer('pointerdown'); pointer('pointerup'); backdrop.click(); expect(backdrop.hidden).toBe(true);
});

it('opens independent equipment navigation and updates it without affecting the other panels', () => {
 click('[data-panel="menu"]');
 [...root.querySelectorAll('.menu-grid button')].find(button => button.textContent === '装备').click();
 expect(root.querySelector('h2').textContent).toBe('装备');
 expect(root.querySelectorAll('.equipment-tabs button')).toHaveLength(4);
 view.update(state); click('[data-close]');
 expect(actions.setModal).toHaveBeenLastCalledWith(false);
 click('[data-panel="profile"]'); expect(root.querySelector('.panel').classList.contains('equipment-panel')).toBe(false);
});

it('keeps server input and focus during a portrait update and prevents unsupported cancellation', () => {
 const token = {}; const close = vi.fn();
 const npc = { kind: 'npc', token, mode: 'text', canClose: false, lines: ['输入'], close, respond: vi.fn() };
 view.showInteraction(npc); const input = root.querySelector('input'); input.value = '正在输入'; input.focus();
 view.showInteraction({ ...npc, image: 'portrait.bmp' });
 expect(root.querySelector('input')).toBe(input); expect(root.activeElement).toBe(input); expect(input.value).toBe('正在输入');
 view.close(); expect(close).not.toHaveBeenCalled(); expect(root.querySelector('.backdrop').hidden).toBe(false);
 view.showInteraction({ kind: 'npc', token: {}, mode: 'menu', canClose: true, options: [], close });
 click('[data-close]'); expect(close).toHaveBeenCalledOnce(); expect(root.querySelector('.backdrop').hidden).toBe(true);
});


it('groups six skills and combat controls at the bottom right and highlights only the pending skill', () => {
 expect(root.querySelector('.target')).toBeNull();
 expect(root.querySelectorAll('.battle-dock [data-shortcut]')).toHaveLength(6);
 expect(root.querySelector('.battle-dock [data-auto-toggle]')).not.toBeNull();
 view.update({ ...state, autoCombat: { active: true, species: [{ id: 1002, name: '波利' }], status: '攻击：波利' } });
 expect(root.querySelector('[data-auto-target]').textContent).toContain('波利');
 expect(root.querySelector('[data-auto-toggle]').getAttribute('aria-pressed')).toBe('true');
 expect(root.querySelector('[data-auto-toggle]').textContent).toBe('停止战斗');
 view.updateShortcuts({ page: 0, pages: 6, slots: Array.from({ length: 6 }, (_, index) => ({ index, name: '技能', available: true, empty: true })), pending: { index: 2, name: '狂击' } });
 expect(root.querySelectorAll('.selected-skill')).toHaveLength(1);
 expect(root.querySelector('.selected-skill').dataset.shortcut).toBe('2');
 expect(root.querySelector('.skill-prompt').hidden).toBe(false);
 expect(root.querySelector('.skill-actions').hidden).toBe(false);
 expect(root.querySelector('.shortcut-tools').hidden).toBe(true);
 expect(root.querySelector('.skill-actions [data-skill-cancel]')).not.toBeNull();
});

it('opens adventure maps directly from the minimap without mounting the old map panel', () => {
 click('[data-panel="map"]');
 expect(actions.openAdventureMap).toHaveBeenCalledOnce();
 expect(actions.setModal).not.toHaveBeenCalledWith(true);
 expect(root.querySelector('.map-preview')).toBeNull();
});

it('updates AP with the character and hides it when unavailable', () => {
 expect(root.querySelector('[data-ap-row]').hidden).toBe(true);
 view.update({ ...state, ap: 75, maxAp: 200 });
 expect(root.querySelector('[data-ap-row]').hidden).toBe(false);
 expect(root.querySelector('[data-ap]').value).toBe(75);
 expect(root.querySelector('[data-ap]').max).toBe(200);
 expect(root.querySelector('[data-ap-text]').textContent).toBe('75 / 200');
 view.update({ ...state, ap: 0, maxAp: 0 });
 expect(root.querySelector('[data-ap-row]').hidden).toBe(true);
});

it('uses the same low HP threshold as the character gauge', () => {
 view.update({ ...state, hp: 24, maxHp: 100 });
 expect(root.querySelector('[data-hp]').classList.contains('low-hp')).toBe(true);
 view.update({ ...state, hp: 25, maxHp: 100 });
 expect(root.querySelector('[data-hp]').classList.contains('low-hp')).toBe(false);
});

it('shows status titles beside live descriptions and preserves selection until expiry', () => {
 view.update({...state,statuses:[{id:1,title:'加速术',description:'提升移动速度',seconds:10},{id:2,title:'天使之赐福',description:'提升属性',seconds:20}]});
 click('[data-panel="status"]');
 expect(root.querySelector('.inventory-list').textContent).toBe('加速术10秒天使之赐福20秒');
 click('[data-status="2"]');const node=root.querySelector('[data-status="2"]');
 view.update({...state,statuses:[{id:1,title:'加速术',description:'提升移动速度',seconds:9},{id:2,title:'天使之赐福',description:'提升属性',seconds:19}]});
 expect(root.querySelector('[data-status="2"]')).toBe(node);
 expect(node.getAttribute('aria-pressed')).toBe('true');
 expect(root.querySelector('.inventory-detail').textContent).toBe('提升属性');
 view.update({...state,statuses:[{id:1,title:'加速术',description:'提升移动速度',seconds:8}]});
 expect(root.querySelector('.inventory-detail').textContent).toBe('提升移动速度');
 view.update({...state,statuses:[]});expect(root.querySelector('.inventory-detail').textContent).toBe('当前没有状态效果');
});

it.each([[2000000,'34m'],[1200000,'20m'],[1000000,'17m'],[999000,'999'],[1000,'1'],[1,'1'],[60000000,'999m'],[0,null]])('formats shortcut cooldown %s without overflowing', (cooldown, expected) => {
 view.updateShortcuts({page:0,pages:1,slots:[{index:0,name:'技能',available:false,empty:false,cooldown}]});
 const timer=root.querySelector('.slot-cooldown');
 expect(timer?.textContent ?? null).toBe(expected);
});

it('returns from submenus and keeps shop messages out of menu buttons', () => {
 click('[data-panel="status"]');expect(root.querySelector('[data-back]').hidden).toBe(false);
 click('[data-back]');expect(root.querySelector('.panel').dataset.view).toBe('menu');expect(root.querySelector('[data-back]').hidden).toBe(true);
 actions.showOwnedVending=()=>false;
 const button=[...root.querySelectorAll('button')].find(b=>b.textContent==='我的摊位');button.click();
 expect(button.textContent).toBe('我的摊位');expect(document.querySelector('.ui-toast').textContent).toContain('尚未开店');
});
it('confirms returning to characters with the shared modal', () => {
 click('[data-panel="menu"]');
 const button=[...root.querySelectorAll('button')].find(b=>b.textContent==='返回选角');button.click();
 expect(actions.returnToCharacters).not.toHaveBeenCalled();expect(root.querySelector('dialog.ui-confirm').open).toBe(true);
 root.querySelector('dialog [data-cancel]').click();expect(actions.returnToCharacters).not.toHaveBeenCalled();
 button.click();root.querySelector('dialog [data-confirm]').click();expect(actions.returnToCharacters).toHaveBeenCalledOnce();
});
