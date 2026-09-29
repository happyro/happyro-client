import { trackTabView } from 'UI/Components/GameTools/TabViewState.js';

const labels = { maps: '地图', monsters: '魔物', npcs: 'NPC', items: '物品', character: '角色', settings: '设置' };

/** Mobile navigation owns presentation; registered features own data and actions. */
export function createAdventureToolsView(root, { tabs, context, close }) {
	root.innerHTML = `<section class="game-tools-window mobile-adventure">
		<header class="adventure-header"><button type="button" data-back hidden>返回</button><nav class="adventure-tabs" role="tablist" aria-label="冒险工具"></nav><button type="button" data-close>关闭</button></header>
		<p class="adventure-feedback" role="status"></p>
		<div class="adventure-content" hidden></div>
	</section>`;
	const $ = selector => root.querySelector(selector);
	const navigation = $('.adventure-tabs'),
		content = $('.adventure-content'),
		back = $('[data-back]');
	const abort = new AbortController();
	const wide = window.matchMedia?.('(min-width: 600px)');
	let active = null,
		cleanup,
		tabView,
		detail = false;
	const scrolls = new Map();
	function disposeTab() {
		// Resolve outstanding confirmations before removing a feature view.
		for (const button of root.querySelectorAll('.game-tools-confirm [data-cancel]')) button.click();
		tabView?.destroy();
		tabView = null;
		cleanup?.();
		cleanup = null;
		content.replaceChildren();
	}
	function showList() {
		detail = false;
		content.classList.remove('show-detail');
		back.hidden = true;
		for (const [node, offset] of scrolls) if (node.isConnected) node.scrollTop = offset;
	}
	function open(tab) {
		if (active?.id === tab.id) return;
		disposeTab();
		active = tab;
		detail = false;
		scrolls.clear();

		content.hidden = false;
		back.hidden = false;
		for (const button of navigation.querySelectorAll('[data-tool]'))
			button.setAttribute('aria-selected', String(button.dataset.tool === tab.id));
		content.className = 'adventure-content';
		content.dataset.feature = tab.id;
		const container = document.createElement('div');
		container.className = 'game-tools-tab';
		container.dataset.tabId = tab.id;
		content.append(container);
		cleanup = tab.mount(container, context);
		tabView = trackTabView(container);
		showList();
		if (tab.id === 'character') {
			detail = true;
			content.classList.add('show-detail');
			back.textContent = '选择职业';
			back.hidden = Boolean(wide?.matches);
		}
	}
	for (const tab of tabs) {
		const button = document.createElement('button');
		button.type = 'button';
		button.dataset.tool = tab.id;
		button.textContent = labels[tab.id] || tab.label;
		button.setAttribute('role', 'tab');
		button.setAttribute('aria-selected', 'false');
		button.onclick = () => open(tab);
		navigation.append(button);
	}
	content.addEventListener(
		'click',
		event => {
			const row = event.target.closest('[data-catalog-key], .monster-row, [data-job-id]');
			if (!row) return;
			for (const node of content.querySelectorAll(
				'.catalog-list, .monster-list, .character-job-list, .catalog-browser, .monster-browser, .character-job-browser'
			))
				scrolls.set(node, node.scrollTop);
			detail = true;
			content.classList.add('show-detail');
			back.textContent = '返回列表';
			back.hidden = Boolean(wide?.matches);
		},
		{ signal: abort.signal }
	);
	back.onclick = showList;
	wide?.addEventListener(
		'change',
		() => {
			back.hidden = wide.matches || !detail;
			back.textContent = '返回列表';
		},
		{ signal: abort.signal }
	);
	$('[data-close]').onclick = close;
	if (tabs.length) open(tabs[0]);
	return {
		feedback(message, error = false) {
			$('.adventure-feedback').textContent = message || '';
			$('.adventure-feedback').classList.toggle('error', error);
		},
		activeFeature: () => active?.id,
		destroy() {
			abort.abort();
			disposeTab();
			root.replaceChildren();
		}
	};
}
