const labels = { inventory: '背包', storage: '仓库', cart: '手推车' };
export function createContainerPanel(body, actions, initialSource) {
	body.innerHTML =
		'<div class="container-toolbar"></div><p class="container-capacity"></p><div class="inventory-layout"><div class="inventory-list"></div><section class="inventory-detail"></section></div><p class="inventory-status" role="status"></p>';
	const $ = selector => body.querySelector(selector);
	const sourceSelect = document.createElement('select');
	sourceSelect.setAttribute('aria-label', '物品所在位置');
	const category = document.createElement('select');
	category.setAttribute('aria-label', '物品分类');
	for (const [key, text] of [
		['all', '全部'],
		['usable', '消耗品'],
		['equipment', '装备'],
		['other', '其他']
	])
		category.add(new Option(text, key));
	$('.container-toolbar').append(sourceSelect, category);
	let source = initialSource,
		selected = null,
		state;
	const nodes = new Map();
	function button(text, fn) {
		const node = document.createElement('button');
		node.type = 'button';
		node.textContent = text;
		node.onclick = fn;
		return node;
	}
	function reset() {
		selected = null;
		$('.inventory-detail').textContent = '点击物品选择转移位置和数量';
	}
	sourceSelect.onchange = () => {
		source = sourceSelect.value;
		reset();
		update();
	};
	category.onchange = () => update();
	function select(item) {
		selected = { index: item.index, ID: item.ID };
		const title = document.createElement('h3');
		title.textContent = item.name;
		const description = document.createElement('p');
		description.textContent = item.description;
		description.className = 'item-description';
		const amount = document.createElement('input');
		amount.type = 'number';
		amount.min = '1';
		amount.max = String(item.count);
		amount.step = '1';
		amount.value = '1';
		amount.setAttribute('aria-label', '转移数量');
		const destination = document.createElement('select');
		destination.setAttribute('aria-label', '转移到');
		for (const target of state.containers.filter(entry => entry !== source))
			destination.add(new Option(labels[target], target));
		const count = document.createElement('p');
		count.className = 'container-item-count';
		count.textContent = `当前数量：${item.count}`;
		const transfer = button('确认转移', () => {
			$('.inventory-status').textContent = actions.transfer(
				source,
				destination.value,
				item.index,
				item.ID,
				Number(amount.value)
			);
			update();
		});
		$('.inventory-detail').replaceChildren(
			title,
			count,
			destination,
			amount,
			button('全部数量', () => {
				amount.value = String(
					state.items.find(entry => entry.index === item.index && entry.ID === item.ID)?.count || 0
				);
			}),
			transfer,
			description
		);
	}
	function update() {
		state = actions.snapshot(source);
		const optionsKey = state.containers.join(',');
		if (sourceSelect.dataset.options !== optionsKey) {
			sourceSelect.replaceChildren(...state.containers.map(key => new Option(labels[key], key)));
			sourceSelect.dataset.options = optionsKey;
			sourceSelect.value = source;
		}
		const capacity = state.capacity;
		$('.container-capacity').textContent = !state.containers.includes(source)
			? `${labels[source]}当前不可用`
			: capacity
				? `格数：${capacity.current}/${capacity.limit}${capacity.weight === undefined ? '' : ` · 重量：${capacity.weight}/${capacity.maxWeight}`}`
				: '已穿戴物品请先卸下再转移';
		const keys = new Set();
		for (const item of state.items.filter(entry => category.value === 'all' || entry.category === category.value)) {
			const key = `${source}:${item.index}:${item.ID}`;
			keys.add(key);
			let node = nodes.get(key);
			if (!node) {
				node = button('', () =>
					select(state.items.find(entry => entry.index === item.index && entry.ID === item.ID))
				);
				node.className = 'inventory-item';
				node.append(document.createElement('img'), document.createElement('span'));
				nodes.set(key, node);
				$('.inventory-list').append(node);
			}
			node.querySelector('span').textContent = `${item.name} ×${item.count}`;
			if (item.icon && node.querySelector('img').getAttribute('src') !== item.icon)
				node.querySelector('img').src = item.icon;
			node.disabled = !state.allowed;
		}
		for (const [key, node] of nodes)
			if (!keys.has(key)) {
				node.remove();
				nodes.delete(key);
			}
		const item = state.items.find(entry => entry.index === selected?.index && entry.ID === selected?.ID);
		if (selected && !item) reset();
		else if (item) {
			$('.container-item-count').textContent = `当前数量：${item.count}`;
			$('.inventory-detail input').max = String(item.count);
		}
		for (const node of $('.inventory-detail').querySelectorAll('button,input,select'))
			node.disabled = !state.allowed;
	}
	reset();
	update();
	return { update };
}
