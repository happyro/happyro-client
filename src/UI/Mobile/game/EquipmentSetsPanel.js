export function createEquipmentSetsPanel(body, service) {
	body.innerHTML =
		'<div class="inventory-layout"><div class="inventory-list" aria-label="方案装备"></div><section class="inventory-detail" aria-label="装备方案详情"></section></div><button type="button" data-swap>切换装备方案</button><p role="status"></p>';
	const $ = selector => body.querySelector(selector),
		list = $('.inventory-list'),
		detail = $('.inventory-detail'),
		nodes = new Map();
	let selected = null,
		key = '',
		swapReview = false;
	function update() {
		const state = service.snapshot();
		$('[data-swap]').disabled = !state.allowed || !state.items.some(item => item.registered);
		const ids = new Set(state.items.map(item => item.index));
		for (const [id, node] of nodes)
			if (!ids.has(id)) {
				node.remove();
				nodes.delete(id);
			}
		for (const item of state.items) {
			let button = nodes.get(item.index);
			if (!button) {
				button = document.createElement('button');
				button.className = 'inventory-item';
				button.onclick = () => {
					selected = item.index;
					key = '';
					update();
				};
				nodes.set(item.index, button);
				list.append(button);
			}
			button.textContent = `${item.name}${item.registered ? ' · 已加入方案' : ''}`;
		}
		const item = state.items.find(entry => entry.index === selected);
		const next = JSON.stringify([item && { ...item, icon: undefined }, state.allowed]);
		if (key === next) return;
		key = next;
		detail.replaceChildren();
		if (!item) {
			detail.textContent = '点选背包装备，设置切换方案';
			return;
		}
		const title = document.createElement('h3');
		title.textContent = item.name;
		const select = document.createElement('select');
		select.setAttribute('aria-label', '方案装备部位');
		for (const slot of state.slots.filter(entry => item.location & entry.location))
			select.add(new Option(slot.label, slot.location));
		if (item.registeredLocation) select.value = item.registeredLocation;
		const button = document.createElement('button');
		button.textContent = item.registered ? '确认移出方案' : '确认加入方案';
		button.disabled = !state.allowed || (!item.registered && (!item.identified || item.damaged));
		button.onclick = () => {
			$('[role=status]').textContent = service.act(
				item.index,
				item.ID,
				Number(select.value),
				item.registered ? 'remove' : 'add'
			);
			key = '';
			update();
		};
		detail.append(title, select, button);
	}
	$('[data-swap]').onclick = () => {
		if (!swapReview) {
			swapReview = true;
			$('[data-swap]').textContent = '确认切换装备方案';
			return;
		}
		swapReview = false;
		$('[data-swap]').textContent = '切换装备方案';
		$('[role=status]').textContent = service.swap();
	};
	update();
	return { update };
}
