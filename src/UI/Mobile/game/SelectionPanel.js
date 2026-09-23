export function createSelectionPanel(body, service) {
	body.innerHTML =
		'<p data-warning></p><div class="inventory-layout"><div class="inventory-list" aria-label="可选列表"></div><section class="inventory-detail" aria-label="选项详情"></section></div><p role="status"></p>';
	const $ = selector => body.querySelector(selector),
		list = $('.inventory-list'),
		detail = $('.inventory-detail');
	let selected = null,
		key = '';
	const nodes = new Map();
	function update() {
		const state = service.snapshot();
		$('[data-warning]').textContent = state.warning;
		for (const entry of state.entries) {
			let b = nodes.get(entry.id);
			if (!b) {
				b = document.createElement('button');
				b.className = 'inventory-item';
				b.innerHTML = '<img alt=""><span></span>';
				b.onclick = () => {
					selected = entry.id;
					key = '';
					update();
				};
				nodes.set(entry.id, b);
				list.append(b);
			}
			b.querySelector('span').textContent = entry.name;
			b.querySelector('img').hidden = !entry.icon;
			if (entry.icon) b.querySelector('img').src = entry.icon;
			b.setAttribute('aria-pressed', String(selected === entry.id));
		}
		const entry = state.entries.find(e => e.id === selected);
		const preview = detail.querySelector('.selection-preview');
		if (preview && entry) {
			preview.hidden = !entry.icon;
			if (entry.icon) preview.src = entry.icon;
		}
		const next = JSON.stringify([entry && { ...entry, icon: undefined }, state.allowed]);
		if (next === key) return;
		key = next;
		detail.replaceChildren();
		if (!entry) {
			detail.textContent = state.entries.length ? '点选条目后确认' : '没有可选条目';
			return;
		}
		const title = document.createElement('h3');
		title.textContent = entry.name;
		const description = document.createElement('p');
		description.className = 'item-description';
		description.textContent = entry.description || '';
		const materials = [];
		if (entry.materials) {
			for (let index = 0; index < 3; index++) {
				const select = document.createElement('select');
				select.setAttribute('aria-label', `附加材料 ${index + 1}`);
				select.add(new Option('不使用附加材料', '0'));
				for (const material of state.materials)
					select.add(new Option(`${material.name} × ${material.count}`, material.id));
				materials.push(select);
				detail.append(select);
			}
		}
		const button = document.createElement('button');
		button.textContent = '确认选择';
		button.disabled = !state.allowed;
		button.onclick = () => {
			$('[role=status]').textContent = service.choose(
				entry.id,
				materials.map(select => Number(select.value)).filter(Boolean)
			);
		};
		if (entry.preview) {
			const img = document.createElement('img');
			img.className = 'selection-preview';
			img.alt = entry.name;
			img.width = img.height = 100;
			img.hidden = !entry.icon;
			if (entry.icon) img.src = entry.icon;
			detail.append(img);
		}
		detail.append(title, description, button);
	}
	update();
	return { update };
}
