export function createMaterialsPanel(body, service) {
	body.innerHTML =
		'<div class="inventory-layout"><div class="inventory-list" aria-label="材料列表"></div><section class="inventory-detail" aria-label="材料详情"></section></div><div class="skills-toolbar"><button type="button" data-review>核对材料</button><button type="button" data-clear>清空材料</button></div><p role="status"></p>';
	const $ = selector => body.querySelector(selector),
		list = $('.inventory-list'),
		detail = $('.inventory-detail');
	let selected = null,
		key = '',
		review = false;
	const nodes = new Map();
	function status(text) {
		$('[role=status]').textContent = text;
	}
	function update() {
		const state = service.snapshot();
		if (state.message) status(state.message);
		$('[data-clear]').disabled = !state.allowed;
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
					selected = item.index;
					review = false;
					key = '';
					update();
				};
				nodes.set(item.index, b);
				list.append(b);
			}
			b.textContent = `${item.name} × ${item.count}`;
		}
		const item = state.items.find(entry => entry.index === selected);
		const next = JSON.stringify([
			review,
			review ? state.order : item && { ...item, icon: undefined },
			state.allowed
		]);
		if (next === key) return;
		key = next;
		detail.replaceChildren();
		if (review) {
			for (const row of state.order) {
				const p = document.createElement('p');
				p.textContent = `${row.name} × ${row.count}${row.description ? '\n' + row.description : ''}`;
				detail.append(p);
			}
			const confirm = document.createElement('button');
			confirm.textContent = '确认消耗材料';
			confirm.disabled = !state.allowed || !state.order.length;
			confirm.onclick = () => status(service.confirm());
			detail.append(confirm);
			return;
		}
		if (!item) {
			detail.textContent = state.instruction || '点选物品，输入转换数量';
			return;
		}
		const name = document.createElement('p');
		name.textContent = `${item.name}${item.description ? '\n' + item.description : ''}`;
		name.style.whiteSpace = 'pre-line';
		const form = document.createElement('form');
		const input = document.createElement('input');
		input.type = 'number';
		input.min = '0';
		input.max = item.count;
		input.step = '1';
		input.value = state.order.find(row => row.index === item.index)?.count || item.requiredCount || 1;
		input.setAttribute('aria-label', '材料数量');
		const save = document.createElement('button');
		save.type = 'submit';
		save.textContent = '加入材料';
		save.disabled = !state.allowed;
		form.append(input, save);
		form.onsubmit = e => {
			e.preventDefault();
			const error = service.set(item.index, item.ID, Number(input.value));
			status(error || '已更新材料，输入 0 可移除');
		};
		detail.append(name, form);
	}
	$('[data-review]').onclick = () => {
		review = true;
		key = '';
		update();
	};
	$('[data-clear]').onclick = () => {
		service.clear();
		review = false;
		key = '';
		update();
	};
	update();
	return { update };
}
