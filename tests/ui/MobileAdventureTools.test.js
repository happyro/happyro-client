import { afterEach, expect, it, vi } from 'vitest';
import { createAdventureToolsView } from '../../src/UI/Mobile/game/AdventureToolsView.js';
let view;
afterEach(() => { view?.destroy(); document.body.replaceChildren(); });
function mount() {
	const root = document.createElement('div'); document.body.append(root);
	const cleanup = vi.fn(), context = { capabilities: { itemGrantAllowed: true } }, close = vi.fn();
	const tabs = ['maps','monsters','npcs','items','character','settings'].map(id => ({
		id, label: id, mount: vi.fn((container, passed) => {
			expect(passed).toBe(context);
			container.innerHTML = '<div class="catalog-list"><button data-catalog-key="1">Entry</button></div><section class="catalog-detail"><input aria-label="数量" value="1"></section>';
			return cleanup;
		})
	}));
	view = createAdventureToolsView(root,{tabs,context,close});
	return { root, tabs, cleanup, close };
}
it('exposes every supplied feature and delegates to its shared implementation with capabilities', () => {
	const { root, tabs, cleanup } = mount();
	expect(root.querySelectorAll('[data-tool]')).toHaveLength(6);
	for (const tab of tabs) {
		root.querySelector(`[data-tool="${tab.id}"]`).click();
		expect(tab.mount).toHaveBeenCalledOnce(); expect(view.activeFeature()).toBe(tab.id);
		expect(root.querySelector(`[data-tool="${tab.id}"]`).getAttribute('aria-selected')).toBe('true');
	}
	expect(cleanup).toHaveBeenCalledTimes(5);
});
it('opens details explicitly and returns to the same list without destroying its search state', () => {
	const { root, tabs } = mount(); root.querySelector('[data-tool="items"]').click();
	const list = root.querySelector('.catalog-list'); list.scrollTop = 150;
	root.querySelector('[data-catalog-key]').click();
	expect(root.querySelector('.show-detail')).not.toBeNull();
	root.querySelector('[data-back]').click();
	expect(root.querySelector('.show-detail')).toBeNull(); expect(list.scrollTop).toBe(150);
	expect(tabs[3].mount).toHaveBeenCalledOnce();
});
it('cancels a pending confirmation before disposing the feature', () => {
	const { root, cleanup } = mount(); root.querySelector('[data-tool="character"]').click();
	const overlay = document.createElement('div'); overlay.className='game-tools-confirm';
	overlay.innerHTML='<button data-cancel>取消</button>'; root.append(overlay);
	const cancel=vi.fn(); overlay.querySelector('button').onclick=cancel;
	view.destroy(); expect(cancel).toHaveBeenCalledOnce(); expect(cleanup).toHaveBeenCalledTimes(2);
});
it('routes close and presents server feedback as text', () => {
	const { root, close } = mount(); view.feedback('<error>',true);
	expect(root.querySelector('[role=status]').textContent).toBe('<error>');
	root.querySelector('[data-close]').click(); expect(close).toHaveBeenCalledOnce();
});

it('opens current character attributes before choosing another profession', () => {
 const { root } = mount(); root.querySelector('[data-tool="character"]').click();
 expect(root.querySelector('.show-detail')).not.toBeNull();
 expect(root.querySelector('[data-back]').textContent).toBe('选择职业');
 root.querySelector('[data-back]').click();
 expect(root.querySelector('.show-detail')).toBeNull();
});
