import { confirmAction } from 'UI/Components/Confirmation.js';
import { createFeedback } from 'UI/Components/Feedback.js';
import { setListItemText } from './ListItemText.js';

/** Shop orders use explicit quantities and a separate review before sending. */
export function createShopPanel(body, service) {
	body.innerHTML =
		'<div class="shop-summary"></div><div class="inventory-layout"><div class="inventory-list" aria-label="商店物品"></div><section class="inventory-detail"></section></div><div class="shop-footer"></div>';
	const $ = selector => body.querySelector(selector);
	const nodes = new Map();
	let selected = null;
	let state;
	const status = createFeedback(body);
	function button(label, fn) {
		const node = document.createElement('button');
		node.type = 'button';
		node.textContent = label;
		node.onclick = fn;
		return node;
	}
	function detail(item) {
		selected = item;
		const title = document.createElement('h3');
		title.textContent = item.name;
		const price = document.createElement('p');
		price.textContent = `单价：${item.price} ${state.currency || 'Zeny'} · 数量上限：${item.limit}`;
		if (item.materials?.length)
			price.textContent +=
				'\n材料：' +
				item.materials
					.map(
						material =>
							`${material.name}${material.refine_level ? `（精炼 +${material.refine_level}）` : ''} ×${material.amount}`
					)
					.join('、');
		const input = document.createElement('input');
		input.type = 'number';
		input.min = '0';
		input.max = String(item.limit);
		input.step = '1';
		input.value = String(item.quantity || 1);
		input.setAttribute('aria-label', '交易数量');
		const description = document.createElement('p');
		description.className = 'item-description';
		description.textContent = item.description;
		$('.inventory-detail').replaceChildren(
			title,
			price,
			input,
			button('设置数量', () => {
				status(service.set(item.index, item.ID, Number(input.value)));
				update();
			}),
			button('移出订单', () => {
				status(service.set(item.index, item.ID, 0));
				input.value = '0';
				update();
			}),
			description
		);
	}
	function review() {
		const signature = JSON.stringify(state.items.filter(entry => entry.quantity));
		confirmAction(
			body,
			state.mode === 'buy' ? '确认购买所选物品？' : '确认出售所选物品？',
			() => {
				if (JSON.stringify(service.snapshot().items.filter(entry => entry.quantity)) !== signature) {
					status('订单已变化，请重新核对', 'error');
					return;
				}
				status(service.submit());
				update();
			},
			{}
		);
	}
	const reviewButton = button('核对订单', review);
	const clearButton = button('清空订单', () => {
		if (service.clear()) {
			selected = null;
			$('.inventory-detail').textContent = '请选择物品';
			status('订单已清空');
			update();
		}
	});
	$('.shop-footer').append(reviewButton, clearButton);
	function update() {
		state = service.snapshot();
		$('.shop-summary').textContent =
			`持有：${state.money} ${state.currency || 'Zeny'} · 订单合计：${state.total} ${state.currency || 'Zeny'}`;
		clearButton.disabled = !state.allowed;
		reviewButton.disabled = !state.allowed || !state.items.some(item => item.quantity);
		const keys = new Set();
		for (const item of state.items) {
			const key = `${item.index}:${item.ID}`;
			keys.add(key);
			let node = nodes.get(key);
			if (!node) {
				node = button('', () => {
					detail(state.items.find(entry => entry.index === item.index && entry.ID === item.ID));
				});
				node.className = 'inventory-item';
				node.append(document.createElement('img'), document.createElement('span'));
				$('.inventory-list').append(node);
				nodes.set(key, node);
			}
			node.disabled = !state.allowed;
			setListItemText(
				node,
				item.name,
				`${item.price} ${state.currency || 'Zeny'}${item.quantity ? ` · 已选 ${item.quantity}` : ''}`
			);
			if (item.icon && node.querySelector('img').getAttribute('src') !== item.icon)
				node.querySelector('img').src = item.icon;
		}
		for (const [key, node] of nodes)
			if (!keys.has(key)) {
				node.remove();
				nodes.delete(key);
			}
		if (selected && !state.items.some(item => item.index === selected.index && item.ID === selected.ID)) {
			selected = null;
			$('.inventory-detail').textContent = '物品已经变化，请重新选择';
		}
		for (const node of $('.inventory-detail').querySelectorAll('button,input')) node.disabled = !state.allowed;
	}
	update();
	return { update };
}
