export function createEnchantPanel(body, service) {
	body.innerHTML =
		'<div class="inventory-layout"><div class="inventory-list" aria-label="可附魔装备"></div><section class="inventory-detail" aria-label="附魔详情"></section></div><p role="status"></p>';
	const $ = selector => body.querySelector(selector),
		list = $('.inventory-list'),
		detail = $('.inventory-detail');
	let key = '',
		choiceKey = null;
	const nodes = new Map();
	function update() {
		const state = service.snapshot();
		$('[role=status]').textContent = state.message;
		const ids = new Set(state.items.map(item => item.index));
		for (const [id, node] of nodes)
			if (!ids.has(id)) {
				node.remove();
				nodes.delete(id);
			}
		for (const item of state.items) {
			let b = nodes.get(item.index);
			if (!b) {
				b = document.createElement('button');
				b.className = 'inventory-item';
				b.onclick = () => {
					const error = service.select(item.index, item.ID);
					if (error) {
						$('[role=status]').textContent = error;
						return;
					}
					key = '';
					choiceKey = null;
					update();
				};
				nodes.set(item.index, b);
				list.append(b);
			}
			b.textContent = item.name;
			b.disabled = !state.allowed;
		}
		const next = JSON.stringify([state.selected, state.choices, state.allowed, choiceKey]);
		if (next === key) return;
		key = next;
		detail.replaceChildren();
		if (!state.selected) {
			detail.textContent = state.message;
			return;
		}
		const select = document.createElement('select');
		select.setAttribute('aria-label', '附魔方式');
		select.add(new Option('请选择附魔方式', ''));
		for (const choice of state.choices) select.add(new Option(choice.name, choice.key));
		select.value = choiceKey || '';
		select.onchange = () => {
			choiceKey = select.value;
			key = '';
			update();
		};
		detail.append(select);
		const choice = state.choices.find(entry => entry.key === choiceKey);
		if (!choice) return;
		const summary = document.createElement('p');
		summary.textContent = `成功率：${choice.rate / 1000}% · 费用：${choice.zeny} Zeny\n${choice.materials.map(material => `${material.name} × ${material.count}`).join('\n')}`;
		summary.className = 'item-description';
		detail.append(summary);
		if (choice.results?.length) {
			const outcomes = document.createElement('p');
			outcomes.textContent = `可能获得：${choice.results.join('、')}`;
			detail.append(outcomes);
		}
		const warning = document.createElement('p');
		warning.textContent = '附魔会消耗费用与材料，重置会清除现有附魔。';
		const confirm = document.createElement('button');
		confirm.textContent = '核对附魔';
		confirm.disabled = !state.allowed;
		let reviewed = false;
		confirm.onclick = () => {
			if (!reviewed) {
				reviewed = true;
				confirm.textContent = '确认消耗并附魔';
				return;
			}
			const error = service.confirm(choice.key, JSON.stringify(choice));
			if (error) $('[role=status]').textContent = error;
		};
		detail.append(warning, confirm);
	}
	update();
	return { update };
}
