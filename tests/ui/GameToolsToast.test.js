import { afterEach, expect, it, vi } from 'vitest';
import { showGameToolsToast, clearGameToolsToast } from '../../src/UI/Components/GameTools/GameToolsToast.js';
afterEach(() => { vi.useRealTimers(); document.body.replaceChildren(); });
it('replaces feedback, escapes names and expires ordinary feedback after three seconds', () => {
	vi.useFakeTimers();
	document.body.innerHTML = '<div class="game-tools-window"><div class="tab-content"></div></div>';
	const root = document.querySelector('.game-tools-window');
	const container = root.firstElementChild;
	showGameToolsToast(container, '已召唤 <波利>');
	expect(root.querySelector('[role=status]').textContent).toContain('<波利>');
	expect(root.querySelector('波利')).toBeNull();
	vi.advanceTimersByTime(2000);
	showGameToolsToast(container, '正在提交...', 'info');
	expect(root.querySelectorAll('.game-tools-toast')).toHaveLength(1);
	vi.advanceTimersByTime(2000);
	expect(root.querySelector('.info')).not.toBeNull();
	vi.advanceTimersByTime(1000);
	expect(root.querySelector('.game-tools-toast')).toBeNull();
});
it('dismisses success after three seconds and supports manual close', () => {
	vi.useFakeTimers();
	document.body.innerHTML = '<div class="game-tools-window"><div></div></div>';
	const container = document.querySelector('.game-tools-window div');
	showGameToolsToast(container, '保存成功');
	vi.advanceTimersByTime(3000);
	expect(document.querySelector('.game-tools-toast')).toBeNull();
	showGameToolsToast(container, '正在提交...', 'info');
	document.querySelector('[aria-label="关闭提示"]').click();
	expect(document.querySelector('.game-tools-toast')).toBeNull();
});

it('clears feedback when the window closes', () => {
	vi.useFakeTimers();
	document.body.innerHTML = '<div class="game-tools-window"><div></div></div>';
	const container = document.querySelector('.game-tools-window div');
	showGameToolsToast(container, '已转职');
	clearGameToolsToast(container);
	expect(document.querySelector('.game-tools-toast')).toBeNull();
	expect(vi.getTimerCount()).toBe(0);
});
