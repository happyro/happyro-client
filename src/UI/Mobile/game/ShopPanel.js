import { confirmAction } from 'UI/Components/Confirmation.js';
import { createFeedback } from 'UI/Components/Feedback.js';
import { setListItemText } from './ListItemText.js';

/** Edit an order locally and revalidate the reviewed terms before submission. */
export function createShopPanel(body, service) {
	body.innerHTML =
		'<div class="shop-summary"></div><div class="inventory-layout"><div class="inventory-list" aria-label="商店物品"></div><section class="inventory-detail" aria-label="物品详情">请选择物品</section></div><div class="shop-footer"><span class="shop-status" role="status"></span></div>';
	const $ = selector => body.querySelector(selector);
	const nodes = new Map();
	let selected = null,
		state,
		input,
		price,
		title,
		description,
		appliedQuantity;
	const feedback = createFeedback(body);
	const keyOf = item => `${item.index}:${item.ID}`;
	const currency = () => state.currency || 'Zeny';
	const signature = snapshot =>
		JSON.stringify([
			snapshot.mode,
			snapshot.currency,
			snapshot.total,
			snapshot.items
				.filter(item => item.quantity)
				.map(({ index, ID, name, quantity, price: unitPrice, limit, materials }) => ({
					index,
					ID,
					name,
					quantity,
					price: unitPrice,
					limit,
					materials
				}))
		]);
	function button(label, action) {
		const node = document.createElement('button');
		node.type = 'button';
		node.textContent = label;
		node.onclick = action;
		return node;
	}
	const hasQuantityDraft = () => selected && input && input.value !== appliedQuantity;
	function requireAppliedQuantity() {
		if (!hasQuantityDraft()) return true;
		feedback('数量尚未应用，请先点击“设置数量”或“撤销修改”', 'error');
		input.focus();
		return false;
	}
	function detail(item) {
		if (!requireAppliedQuantity()) return;
		selected = keyOf(item);
		title = document.createElement('h3');
		price = document.createElement('p');
		price.className = 'shop-price';
		const form = document.createElement('form');
		form.className = 'shop-quantity';
		const label = document.createElement('label');
		label.textContent = '数量';
		input = document.createElement('input');
		input.type = 'number';
		input.required = true;
		input.min = '0';
		input.step = '1';
		input.value = String(item.quantity || Math.min(1, item.limit));
		input.setAttribute('aria-label', '交易数量');
		appliedQuantity = input.value;
		input.oninput = update;
		label.append(input);
		const set = button('设置数量', () => {});
		set.type = 'submit';
		form.onsubmit = event => {
			event.preventDefault();
			if (!input.reportValidity()) return;
			const message = service.set(item.index, item.ID, Number(input.value));
			if (message) feedback(message, 'error');
			else {
				appliedQuantity = input.value;
				feedback('订单数量已更新', 'success');
			}
			update();
		};
		const remove = button('移出订单', () => {
			const message = service.set(item.index, item.ID, 0);
			if (message) feedback(message, 'error');
			else input.value = appliedQuantity = '0';
			update();
		});
		const revert = button('撤销修改', () => {
			input.value = appliedQuantity;
			update();
		});
		revert.dataset.revertQuantity = '';
		form.append(label, set, remove, revert);
		description = document.createElement('p');
		description.className = 'item-description';
		$('.inventory-detail').replaceChildren(title, price, form, description);
		update();
	}
	function review() {
		update();
		if (!state.allowed || !requireAppliedQuantity() || !state.items.some(item => item.quantity)) return;
		const reviewed = signature(state);
		const content = document.createElement('div');
		content.className = 'shop-review';
		const lines = document.createElement('div');
		lines.className = 'shop-review-lines';
		content.append(lines);
		for (const item of state.items.filter(entry => entry.quantity)) {
			const line = document.createElement('p');
			line.textContent = `${item.name} × ${item.quantity} · ${item.price * item.quantity} ${currency()}`;
			if (item.materials?.length)
				line.textContent +=
					'\n材料：' +
					item.materials
						.map(
							m =>
								`${m.name}${m.refine_level ? `（精炼 +${m.refine_level}）` : ''} × ${m.amount * item.quantity}`
						)
						.join('、');
			lines.append(line);
		}
		const total = document.createElement('strong');
		total.textContent = `${state.mode === 'buy' ? '支付' : '获得'}合计：${state.total} ${currency()}`;
		content.append(total);
		confirmAction(
			body,
			state.mode === 'buy' ? '确认购买以下物品？' : '确认出售以下物品？',
			() => {
				if (signature(service.snapshot()) !== reviewed) {
					feedback('订单已变化，请重新核对', 'error');
					update();
					return;
				}
				const result = service.submit();
				feedback(result, result === '已提交，等待服务器回复' ? 'info' : 'error');
				update();
			},
			{ content }
		);
	}
	const reviewButton = button('核对订单', review);
	const clearButton = button('清空订单', () => {
		if (service.clear()) {
			selected = null;
			$('.inventory-detail').textContent = '请选择物品';
			feedback('订单已清空', 'success');
			update();
		}
	});
	$('.shop-footer').append(reviewButton, clearButton);
	const empty = document.createElement('p');
	empty.className = 'shop-empty';
	$('.inventory-list').append(empty);
	function update() {
		state = service.snapshot();
		$('.shop-summary').textContent =
			`持有：${state.money} ${currency()} · ${state.mode === 'buy' ? '支付' : '获得'}合计：${state.total} ${currency()}`;
		$('.shop-status').textContent = state.pending
			? '等待服务器回复…'
			: hasQuantityDraft()
				? '数量已修改，尚未应用'
				: `已选 ${state.items.filter(item => item.quantity).length} 种物品`;
		clearButton.disabled = !state.allowed;
		reviewButton.disabled = !state.allowed || (!hasQuantityDraft() && !state.items.some(item => item.quantity));
		empty.hidden = state.items.length > 0;
		empty.textContent = state.mode === 'sell' ? '没有可出售的物品' : '商店暂无商品';
		const keys = new Set();
		for (const item of state.items) {
			const key = keyOf(item);
			keys.add(key);
			let node = nodes.get(key);
			if (!node) {
				node = button('', () => {
					const current = state.items.find(entry => keyOf(entry) === key);
					if (current) detail(current);
				});
				node.className = 'inventory-item';
				const image = document.createElement('img');
				image.alt = '';
				node.append(image, document.createElement('span'));
				$('.inventory-list').append(node);
				nodes.set(key, node);
			}
			node.disabled = !state.allowed;
			node.setAttribute('aria-pressed', String(selected === key));
			setListItemText(
				node,
				item.name,
				`${item.price} ${currency()}${item.limit === 0 ? ' · 无库存' : ''}${item.quantity ? ` · 已选 ${item.quantity}` : ''}`
			);
			const image = node.querySelector('img');
			image.hidden = !item.icon;
			if (item.icon && image.getAttribute('src') !== item.icon) image.src = item.icon;
		}
		for (const [key, node] of nodes)
			if (!keys.has(key)) {
				node.remove();
				nodes.delete(key);
			}
		const item = state.items.find(entry => keyOf(entry) === selected);
		if (selected && !item) {
			selected = null;
			$('.inventory-detail').textContent = '物品已经变化，请重新选择';
		}
		if (item) {
			title.textContent = item.name;
			description.textContent = item.description || '';
			price.textContent = `单价：${item.price} ${currency()} · 数量上限：${item.limit}`;
			if (item.materials?.length)
				price.textContent +=
					'\n材料：' +
					item.materials
						.map(m => `${m.name}${m.refine_level ? `（精炼 +${m.refine_level}）` : ''} × ${m.amount}`)
						.join('、');
			input.max = String(item.limit);
		}
		const revert = $('[data-revert-quantity]');
		if (revert) revert.hidden = !hasQuantityDraft();
		for (const node of $('.inventory-detail').querySelectorAll('button,input')) node.disabled = !state.allowed;
	}
	update();
	return { update };
}
