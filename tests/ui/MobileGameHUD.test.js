import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameHUDView } from '../../src/UI/Mobile/game/GameHUDView.js';
import { clearChatFeed, publishChatMessage, subscribeChatFeed } from '../../src/UI/Game/ChatFeed.js';

let host, root, view, actions;
const state = { name: '测试角色', job: '初心者', level: 10, jobLevel: 5, money: 123, hp: 80, maxHp: 100, sp: 20, maxSp: 40, position: [12, 34], mapName: '普隆德拉', statuses: [{ id: 1, description: '加速术 10秒', icon: 'data:image/png;base64,AA==' }] };
beforeEach(() => {
	host = document.createElement('div'); document.body.append(host); root = host.attachShadow({ mode: 'open' });
	actions = { cancelSceneInput: vi.fn(), setModal: vi.fn(), sendChat: vi.fn(), returnToCharacters: vi.fn() };
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
	it('keeps combat placeholders disabled and provides menu navigation', () => {
		expect([...root.querySelectorAll('.combat button')].every(button => button.disabled)).toBe(true);
		click('[data-panel="menu"]');
		const buttons = [...root.querySelectorAll('.menu-grid button')];
		expect(buttons.find(button => button.textContent === '背包').disabled).toBe(true);
		buttons.find(button => button.textContent === '人物').click();
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
