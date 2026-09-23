/** Independent touch equipment view; server snapshots own all item and stat values. */
export function createEquipmentPanel(body, actions) {
	body.innerHTML =
		'<nav class="equipment-tabs" aria-label="装备分类"></nav><div class="equipment-layout"><div class="equipment-slots" aria-label="装备部位"></div><section class="equipment-detail" aria-label="装备详情"></section></div><dl class="equipment-stats" hidden></dl><p class="equipment-message" role="status"></p>';
	const $ = selector => body.querySelector(selector);
	const slotsRoot = $('.equipment-slots'),
		detail = $('.equipment-detail');
	let group = 'normal',
		selected = 'HEAD_TOP',
		changing = false,
		choice = null,
		detailKey = '';
	let state;
	const slots = new Map(),
		statNodes = new Map();
	function button(text, fn) {
		const node = document.createElement('button');
		node.type = 'button';
		node.textContent = text;
		node.onclick = fn;
		return node;
	}
	function message(text) {
		$('.equipment-message').textContent = text;
	}
	function select(slot) {
		selected = slot.key;
		changing = !slot.item;
		choice = null;
		detailKey = '';
		message('');
		render();
		detail.scrollTop = 0;
	}
	for (const [key, label] of [
		['normal', '装备'],
		['costume', '时装'],
		['shadow', '影子'],
		['stats', '属性']
	]) {
		const tab = button(label, () => {
			group = key;
			const first = state.slots.find(slot => slot.group === group);
			if (first) select(first);
			else render();
		});
		tab.dataset.group = key;
		$('.equipment-tabs').append(tab);
	}
	function itemDetails(item) {
		const title = document.createElement('h3');
		title.textContent = item.name;
		const description = document.createElement('p');
		description.className = 'item-description';
		description.textContent = item.description || '暂无装备说明';
		const status = document.createElement('p');
		status.textContent = `数量：${item.count}${item.worn ? ' · 已穿戴' : ''}${!item.identified ? ' · 未鉴定' : ''}${item.damaged ? ' · 已损坏' : ''}`;
		return [title, status, description];
	}
	function perform(slot, item, action) {
		message(actions.act(slot.key, item.index, item.ID, action));
		update();
	}
	function renderDetail() {
		const slot = state.slots.find(entry => entry.key === selected);
		if (!slot) return;
		if (changing && choice && slot.item?.index === choice.index && slot.item?.ID === choice.ID) {
			changing = false;
			choice = null;
		}
		const key = JSON.stringify([slot, changing, choice]);
		if (key === detailKey) return;
		detailKey = key;
		detail.replaceChildren();
		const heading = document.createElement('h3');
		heading.textContent = slot.label;
		detail.append(heading);
		if (!changing) {
			if (!slot.item) detail.append(document.createTextNode('此部位未穿戴装备'));
			else {
				const remove = button('卸下', () => perform(slot, slot.item, 'unequip'));
				remove.disabled = Boolean(slot.item.reason);
				const [title, status, description] = itemDetails(slot.item);
				detail.append(title, status, remove, description);
				if (slot.item.reason) {
					const reason = document.createElement('p');
					reason.textContent = slot.item.reason;
					detail.append(reason);
				}
			}
			const change = button(slot.item ? '更换' : '选择装备', () => {
				changing = true;
				choice = null;
				detailKey = '';
				renderDetail();
			});
			const description = detail.querySelector('.item-description');
			if (description) description.before(change);
			else detail.append(change);
			return;
		}
		detail.append(
			button('返回部位详情', () => {
				changing = false;
				choice = null;
				detailKey = '';
				renderDetail();
			})
		);
		const selectedItem = slot.candidates.find(item => item.index === choice?.index && item.ID === choice?.ID);
		if (selectedItem) {
			const equip = button('穿戴', () => perform(slot, selectedItem, 'equip'));
			equip.disabled = Boolean(selectedItem.reason);
			const [title, status, description] = itemDetails(selectedItem);
			detail.append(title, status, equip, description);
			if (selectedItem.reason) {
				const reason = document.createElement('p');
				reason.textContent = selectedItem.reason;
				detail.append(reason);
			}
		}
		const label = document.createElement('p');
		label.textContent = slot.candidates.length ? '点击背包中的装备查看并穿戴' : '背包中没有此部位的装备';
		detail.append(label);
		for (const item of slot.candidates) {
			const candidate = button('', () => {
				choice = { index: item.index, ID: item.ID };
				detailKey = '';
				renderDetail();
				detail.scrollTop = 0;
			});
			candidate.className = 'equipment-candidate';
			candidate.dataset.index = item.index;
			candidate.setAttribute('aria-pressed', String(selectedItem?.index === item.index));
			const image = document.createElement('img');
			image.alt = '';
			if (item.icon) image.src = item.icon;
			const text = document.createElement('span');
			text.textContent = item.name;
			candidate.append(image, text);
			detail.append(candidate);
		}
	}
	function render() {
		for (const tab of $('.equipment-tabs').children)
			tab.setAttribute('aria-pressed', String(tab.dataset.group === group));
		$('.equipment-layout').hidden = group === 'stats';
		$('.equipment-stats').hidden = group !== 'stats';
		for (const slot of state.slots) {
			let node = slots.get(slot.key);
			if (!node) {
				node = button('', () => select(state.slots.find(entry => entry.key === slot.key)));
				node.className = 'equipment-slot';
				node.dataset.slot = slot.key;
				node.append(
					document.createElement('img'),
					document.createElement('strong'),
					document.createElement('span')
				);
				slots.set(slot.key, node);
				slotsRoot.append(node);
			}
			node.hidden = slot.group !== group;
			node.setAttribute('aria-pressed', String(selected === slot.key));
			node.querySelector('strong').textContent = slot.label;
			node.querySelector('span').textContent = slot.item?.name || '＋ 选择装备';
			const image = node.querySelector('img');
			image.alt = '';
			image.hidden = !slot.item?.icon;
			if (slot.item?.icon && image.getAttribute('src') !== slot.item.icon) image.src = slot.item.icon;
		}
		for (const stat of state.stats) {
			if (!statNodes.has(stat.key)) {
				const dt = document.createElement('dt');
				dt.textContent = stat.label;
				const dd = document.createElement('dd');
				dd.dataset.stat = stat.key;
				$('.equipment-stats').append(dt, dd);
				statNodes.set(stat.key, dd);
			}
			statNodes.get(stat.key).textContent = stat.value;
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
