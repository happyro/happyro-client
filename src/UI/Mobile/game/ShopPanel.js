/** Shop orders use explicit quantities and a separate review before sending. */
export function createShopPanel(body, service) {
	body.innerHTML =
		'<div class="shop-summary"></div><div class="inventory-layout"><div class="inventory-list" aria-label="商店物品"></div><section class="inventory-detail"></section></div><div class="shop-footer"></div><p class="inventory-status" role="status"></p>';
	const $ = selector => body.querySelector(selector);
	const nodes = new Map();
	let selected = null;
	let state;
	const status = message => {
		$('.inventory-status').textContent = message;
	};
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
		const reviewArea = $('.inventory-detail');
		reviewArea.replaceChildren();
		for (const item of state.items.filter(entry => entry.quantity)) {
			const row = document.createElement('p');
			row.textContent = `${item.name} ×${item.quantity} = ${item.price * item.quantity} ${state.currency || 'Zeny'}`;
			if (item.materials?.length)
				row.textContent +=
					'\n消耗材料：' +
					item.materials
						.map(
							material =>
								`${material.name}${material.refine_level ? `（精炼 +${material.refine_level}）` : ''} ×${material.amount * item.quantity}`
						)
						.join('、');
			reviewArea.append(row);
		}
		const total = document.createElement('p');
		total.textContent = `${state.mode === 'buy' ? '支付' : '获得'}：${state.total} ${state.currency || 'Zeny'}`;
		reviewArea.append(
			total,
			button(state.mode === 'buy' ? '确认购买' : '确认出售', () => {
				status(service.submit());
				update();
			}),
			button('返回修改', () => {
				if (selected) detailItem();
				else reviewArea.textContent = '请选择物品';
			})
		);
	}
	function detailItem() {
		const item = state.items.find(entry => entry.index === selected?.index && entry.ID === selected?.ID);
		if (item) detail(item);
	}
	const reviewButton = button('核对订单', review);
	const clearButton = button('清空订单', () => {
		if (service.clear()) {
			selected = null;
			$('.inventory-detail').textContent = '订单已清空，请重新选择物品';
			status('');
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
			node.querySelector('span').textContent =
				`${item.name} · ${item.price} ${state.currency || 'Zeny'}${item.quantity ? ` · 已选 ${item.quantity}` : ''}`;
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
