import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameHUDView } from '../../src/UI/Mobile/game/GameHUDView.js';
import { clearChatFeed, publishChatMessage, subscribeChatFeed } from '../../src/UI/Game/ChatFeed.js';

let host, root, view, actions;
const state = { name: '测试角色', job: '初心者', level: 10, jobLevel: 5, money: 123, hp: 80, maxHp: 100, sp: 20, maxSp: 40, position: [12, 34], mapName: '普隆德拉', statuses: [{ id: 1, description: '加速术 10秒', icon: 'data:image/png;base64,AA==' }] };
beforeEach(() => {
	host = document.createElement('div'); document.body.append(host); root = host.attachShadow({ mode: 'open' });
	actions = { equipmentSnapshot: () => ({ slots: [], stats: [] }), inventorySnapshot: () => [], cancelSceneInput: vi.fn(), setModal: vi.fn(), sendChat: vi.fn(), returnToCharacters: vi.fn() };
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
		const input = root.querySelector('input'); input.value = '正在输入'; input.focus();
		view.update({ ...state, hp: 30 });
		expect(root.querySelector('input')).toBe(input);
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
		view.setMessages(['<img src=x onerror=alert(1)>']);
		expect(root.querySelector('.chat-log img')).toBeNull();
		root.querySelector('input').value = '你好';
		root.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		expect(actions.sendChat).toHaveBeenCalledExactlyOnceWith('你好');
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
