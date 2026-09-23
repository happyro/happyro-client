export function createVendingPanel(body, service) {
	body.innerHTML =
		'<div class="inventory-layout"><div class="inventory-list"></div><section class="inventory-detail"><div data-fields></div><div data-selected></div><div data-order></div><button data-submit></button><button data-cancel>取消开店</button><p data-message role="status"></p></section></div>';
	const $ = selector => body.querySelector(selector),
		nodes = new Map();
	let selected = null,
		key = '',
		confirm = false;
	const initial = service.snapshot();
	$('[data-cancel]').hidden = Boolean(initial.owned);
	$('[data-cancel]').onclick = () => service.close();
	if (!initial.owned) {
		$('[data-fields]').innerHTML =
			'<label>摊位名称<input data-title maxlength="24"></label><label data-budget-label>收购预算<input data-budget type="number" min="1" step="1"></label>';
		$('[data-budget-label]').hidden = initial.mode !== 'buy';
		$('[data-fields]').oninput = () => {
			confirm = false;
			update();
		};
	}
	$('[data-submit]').onclick = () => {
		if (!confirm) {
			confirm = true;
			update();
			return;
		}
		confirm = false;
		$('[data-message]').textContent = initial.owned
			? service.closeStore()
			: service.submit($('[data-title]').value, Number($('[data-budget]').value));
		update();
	};
	function update() {
		const state = service.snapshot();
		$('[data-cancel]').disabled = Boolean(state.pending);
		for (const [id, node] of nodes)
			if (!state.items.some(item => item.index === id)) {
				node.remove();
				nodes.delete(id);
			}
		for (const item of state.items) {
			let node = nodes.get(item.index);
			if (!node) {
				node = document.createElement('button');
				node.className = 'inventory-item';
				node.onclick = () => {
					selected = item.index;
					key = '';
					confirm = false;
					update();
				};
				nodes.set(item.index, node);
				$('.inventory-list').append(node);
			}
			node.textContent = `${item.name} × ${item.count}${state.owned ? ' · ' + item.price + ' Zeny' : ''}`;
			node.setAttribute('aria-pressed', String(selected === item.index));
		}
		const item = state.items.find(row => row.index === selected),
			next = JSON.stringify([item && { ...item, icon: undefined }, state.allowed]);
		if (next !== key) {
			key = next;
			const panel = $('[data-selected]');
			panel.replaceChildren();
			if (item) {
				const description = document.createElement('p');
				description.className = 'item-description';
				description.textContent = item.description;
				panel.append(description);
				if (!state.owned) {
					const amount = document.createElement('input'),
						price = document.createElement('input');
					for (const input of [amount, price]) {
						input.type = 'number';
						input.min = '0';
						input.step = '1';
					}
					amount.value = String(item.quantity || 1);
					amount.setAttribute('aria-label', '数量');
					price.value = String(item.price);
					price.setAttribute('aria-label', '单价');
					const button = document.createElement('button');
					button.textContent = '保存数量与单价（数量 0 移除）';
					button.disabled = !state.allowed;
					button.onclick = () => {
						confirm = false;
						$('[data-message]').textContent = service.set(
							item.index,
							item.identity,
							Number(amount.value),
							Number(price.value)
						);
						update();
					};
					panel.append(amount, price, button);
				}
			} else panel.textContent = '点选物品查看详情';
		}
		$('[data-order]').textContent = state.owned
			? `剩余预算：${state.budget ?? '—'}\n${state.log.join('\n')}`
			: `${state.order.length}/${state.slots} 栏 · 合计 ${state.total} Zeny\n` +
				state.order.map(row => `${row.name} × ${row.count} · 单价 ${row.price}`).join('\n');
		$('[data-submit]').textContent = confirm
			? state.owned
				? '确认关闭摊位'
				: '确认开店'
			: state.owned
				? '关闭摊位'
				: '核对开店';
		$('[data-submit]').disabled = !state.allowed;
	}
	update();
	return { update };
}
