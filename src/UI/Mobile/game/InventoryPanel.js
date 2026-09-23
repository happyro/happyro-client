/** Touch-only inventory presentation. Actions receive inventory indices, never DOM-derived item data. */
export function createInventoryPanel(body, actions) {
	body.innerHTML =
		'<nav class="inventory-tabs" aria-label="背包分类"></nav><div class="inventory-layout"><div class="inventory-list" aria-label="物品列表"></div><section class="inventory-detail" aria-label="物品详情"></section></div><p class="inventory-status" role="status"></p>';
	const $ = selector => body.querySelector(selector);
	const list = $('.inventory-list'),
		detail = $('.inventory-detail');
	let category = 'all',
		selected = null,
		state = [],
		detailKey = '',
		binding = false;
	const buttons = new Map();
	const sort = document.createElement('select');
	sort.setAttribute('aria-label', '背包排序');
	for (const [key, name] of [
		['index', '原始顺序'],
		['name', '名称排序'],
		['count', '数量排序'],
		['category', '分类排序']
	])
		sort.add(new Option(name, key));
	sort.onchange = () => render();
	body.prepend(sort);
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
	for (const [key, label] of [
		['all', '全部'],
		['usable', '消耗品'],
		['equipment', '装备'],
		['other', '其他'],
		['worn', '已穿戴']
	]) {
		const tab = button(label, () => {
			category = key;
			render();
		});
		tab.dataset.category = key;
		$('.inventory-tabs').append(tab);
	}
	function renderDetail() {
		const item = state.find(entry => entry.index === selected?.index && entry.ID === selected?.ID);
		if (!item) {
			selected = null;
			binding = false;
			detailKey = '';
			detail.textContent = '点击物品查看详情和操作';
			return;
		}
		const key = JSON.stringify(item);
		if (binding || key === detailKey) return;
		detailKey = key;
		const title = document.createElement('h3');
		title.textContent = item.name;
		const count = document.createElement('p');
		count.textContent = `数量：${item.count}${item.worn ? ' · 已穿戴' : ''}${!item.identified ? ' · 未鉴定' : ''}${item.damaged ? ' · 已损坏' : ''}`;
		const description = document.createElement('p');
		description.className = 'item-description';
		description.textContent = item.description || '暂无物品说明';
		const ops = document.createElement('div');
		ops.className = 'inventory-actions';
		if (item.action) {
			const use = button({ use: '使用', equip: '穿戴', unequip: '卸下', card: '镶嵌卡片' }[item.action], () => {
				status(actions.act(item.index, item.ID, item.action));
				update();
			});
			use.disabled = Boolean(item.reason);
			ops.append(use);
		}
		if (item.shortcut) ops.append(button('设置快捷槽', () => chooseBinding(item)));
		if (!item.worn) ops.append(button('丢弃', () => chooseDrop(item)));
		const reason = document.createElement('p');
		reason.textContent = item.reason;
		detail.replaceChildren(title, count, ops, reason, description);
	}
	function chooseDrop(item) {
		binding = true;
		const warning = document.createElement('p');
		warning.textContent = `丢弃 ${item.name} 后物品将落到地上，可能被其他玩家拾取。`;
		const input = document.createElement('input');
		input.type = 'number';
		input.min = '1';
		input.max = String(Math.min(item.count, 65535));
		input.step = '1';
		input.value = '1';
		input.setAttribute('aria-label', '丢弃数量');
		const confirm = button('确认丢弃', () => {
			status(actions.drop(item.index, item.ID, Number(input.value)));
			binding = false;
			detailKey = '';
			update();
		});
		const cancel = button('取消丢弃', () => {
			binding = false;
			detailKey = '';
			renderDetail();
		});
		detail.replaceChildren(warning, input, confirm, cancel);
	}
	function chooseBinding(item) {
		binding = true;
		const title = document.createElement('p');
		title.textContent = `将 ${item.name} 设置到快捷槽；已有内容将被替换。`;
		const select = document.createElement('select');
		select.setAttribute('aria-label', '目标快捷槽');
		const page = actions.shortcuts();
		for (let i = 0; i < page.total; i++) select.add(new Option(`槽位 ${i + 1}`, String(i)));
		select.value = String(page.slots[0].index);
		const preview = document.createElement('p');
		function describeSlot() {
			preview.textContent = `当前内容：${actions.slotName(Number(select.value))}`;
		}
		select.onchange = describeSlot;
		describeSlot();
		const save = button('确认设置', () => {
			const success = actions.bind(item.index, item.ID, Number(select.value));
			status(success ? `已设置到槽位 ${Number(select.value) + 1}` : '设置失败，物品或角色状态已经变化');
			binding = false;
			detailKey = '';
			update();
		});
		const cancel = button('取消设置', () => {
			binding = false;
			detailKey = '';
			renderDetail();
		});
		detail.replaceChildren(title, select, preview, save, cancel);
	}
	function render() {
		for (const tab of $('.inventory-tabs').children)
			tab.setAttribute('aria-pressed', String(tab.dataset.category === category));
		const filtered = state.filter(
			item => category === 'all' || (category === 'worn' ? item.worn : item.category === category)
		);
		filtered.sort((a, b) =>
			sort.value === 'name'
				? a.name.localeCompare(b.name, 'zh-CN')
				: sort.value === 'count'
					? b.count - a.count || a.index - b.index
					: sort.value === 'category'
						? a.category.localeCompare(b.category) || a.name.localeCompare(b.name, 'zh-CN')
						: a.index - b.index
		);
		const keys = new Set(filtered.map(item => `${item.index}:${item.ID}`));
		for (const [key, node] of buttons)
			if (!keys.has(key)) {
				node.remove();
				buttons.delete(key);
			}
		list.querySelector('p')?.remove();
		if (!filtered.length) {
			const empty = document.createElement('p');
			empty.textContent = '该分类暂无物品';
			list.append(empty);
		}
		for (const [position, item] of filtered.entries()) {
			const key = `${item.index}:${item.ID}`;
			let node = buttons.get(key);
			if (!node) {
				node = button('', () => {
					selected = { index: item.index, ID: item.ID };
					binding = false;
					detailKey = '';
					status('');
					render();
					detail.scrollTop = 0;
				});
				node.className = 'inventory-item';
				node.dataset.index = item.index;
				node.append(document.createElement('img'), document.createElement('span'));
				buttons.set(key, node);
				list.append(node);
			}
			if (list.children[position] !== node) list.insertBefore(node, list.children[position] || null);
			const image = node.querySelector('img');
			image.alt = '';
			if (item.icon && image.getAttribute('src') !== item.icon) image.src = item.icon;
			node.querySelector('span').textContent = `${item.name} ×${item.count}${item.worn ? ' · 已穿戴' : ''}`;
			node.setAttribute('aria-pressed', String(selected?.index === item.index && selected?.ID === item.ID));
		}
		renderDetail();
	}
	function update() {
		state = actions.snapshot();
		render();
	}
	update();
	return { update };
}
