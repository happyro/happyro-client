import { interactionFooter } from './InteractionPanel.js';
import { createFeedback } from 'UI/Components/Feedback.js';
import { setListItemText } from './ListItemText.js';

const labels = { inventory: '背包', storage: '仓库', cart: '手推车' };
export function createContainerPanel(body, actions, initialSource) {
	body.innerHTML =
		'<div class="container-toolbar"></div><div class="inventory-layout"><div class="inventory-list"></div><section class="inventory-detail"></section></div>';
	const warehouse = initialSource === 'storage';
	body.classList.toggle('warehouse-body', warehouse);
	const feedback = createFeedback(body);
	const $ = selector => body.querySelector(selector);
	const { footer, status } = interactionFooter(body);
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
	const capacityLabel = document.createElement('span');
	capacityLabel.className = 'container-capacity';
	const sourceField = document.createElement('div');
	sourceField.className = 'container-source';
	sourceField.append(sourceSelect);
	const search = document.createElement('input');
	search.type = 'search';
	search.placeholder = '搜索名称或物品 ID';
	search.setAttribute('aria-label', '搜索仓库物品');
	const modes = document.createElement('div');
	modes.className = 'storage-modes';
	if (warehouse) {
		for (const [value, title] of [
			['storage', '取出'],
			['inventory', '存入']
		]) {
			const tab = button(title, () => {
				source = value;
				reset();
				update();
			});
			tab.dataset.mode = value;
			modes.append(tab);
		}
	}
	$('.container-toolbar').append(...(warehouse ? [modes] : []), sourceField, category, capacityLabel);
	if (warehouse) $('.container-toolbar').append(search);
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
		footer.querySelectorAll('button').forEach(node => node.remove());
		$('.inventory-detail').textContent = '点击物品选择转移位置和数量';
	}
	sourceSelect.onchange = () => {
		source = sourceSelect.value;
		reset();
		update();
	};
	category.onchange = () => update();
	search.oninput = () => update();
	function targets() {
		return state.containers.filter(
			entry => entry !== source && (!warehouse || source === 'storage' || entry === 'storage')
		);
	}
	function select(item) {
		if (!item) return;
		footer.querySelectorAll('button').forEach(node => node.remove());
		selected = { index: item.index, ID: item.ID, identity: item.identity };
		const title = document.createElement('h3');
		title.textContent = item.name;
		const description = document.createElement('p');
		description.textContent = item.description;
		description.className = 'item-description';
		const amount = document.createElement('input');
		amount.type = 'number';
		amount.required = true;
		amount.min = '1';
		amount.max = String(item.count);
		amount.step = '1';
		amount.value = '1';
		amount.setAttribute('aria-label', '转移数量');
		const destination = document.createElement('select');
		destination.setAttribute('aria-label', '转移到');
		for (const target of targets()) destination.add(new Option(labels[target], target));
		const count = document.createElement('p');
		count.className = 'container-item-count';
		count.textContent = `当前数量：${item.count}`;
		const transfer = button('确认转移', () => {
			if (!amount.reportValidity() || !destination.value) return;
			const result = actions.transfer(
				source,
				destination.value,
				item.index,
				item.ID,
				Number(amount.value),
				item.identity
			);
			feedback(result, result === '已请求转移，等待服务器更新' ? 'info' : 'error');
			update();
		});
		const form = document.createElement('div');
		form.className = 'container-form';
		for (const [text, control] of [
			['转移到', destination],
			['转移数量', amount]
		]) {
			const label = document.createElement('label');
			label.append(document.createTextNode(text), control);
			form.append(label);
		}
		$('.inventory-detail').replaceChildren(title, count, form, description);
		footer.append(
			button('全部数量', () => {
				amount.value = String(
					state.items.find(entry => entry.index === item.index && entry.ID === item.ID)?.count || 0
				);
			}),
			transfer
		);
		update();
	}
	function update() {
		state = actions.snapshot(source);
		if (
			warehouse &&
			source !== 'storage' &&
			!state.containers.includes(source) &&
			state.containers.includes('inventory')
		) {
			source = 'inventory';
			reset();
			state = actions.snapshot(source);
		}
		status.textContent =
			state.transferStatus ||
			(state.allowed
				? warehouse
					? `${labels[source]} → ${
							source === 'storage'
								? targets()
										.map(key => labels[key])
										.join(' / ')
								: '仓库'
						}`
					: '选择物品、位置和数量后转移'
				: '当前不可操作，请等待服务器更新');
		for (const tab of modes.children) {
			tab.setAttribute('aria-pressed', String((source === 'storage') === (tab.dataset.mode === 'storage')));
			tab.disabled = !state.allowed || state.pending;
		}
		sourceField.hidden = warehouse && source === 'storage';
		const sources = state.containers.filter(entry => !warehouse || entry !== 'storage');
		const optionsKey = sources.join(',');
		if (sourceSelect.dataset.options !== optionsKey) {
			sourceSelect.replaceChildren(...sources.map(key => new Option(labels[key], key)));
			sourceSelect.dataset.options = optionsKey;
		}
		sourceSelect.value = source;
		sourceSelect.disabled = !state.allowed || state.pending;
		const capacity = warehouse ? state.storageCapacity : state.capacity;
		const unavailable = !state.containers.includes(source);
		capacityLabel.hidden = unavailable || !capacity;
		capacityLabel.textContent =
			capacity && !unavailable
				? `${warehouse ? '仓库' : ''}格数：${capacity.current}/${capacity.limit}${capacity.weight === undefined ? '' : ` · 重量：${capacity.weight}/${capacity.maxWeight}`}`
				: '';
		if (unavailable && source !== 'cart') feedback.update(`${labels[source]}当前不可用`);

		const keys = new Set();
		const query = search.value.trim().toLocaleLowerCase();
		const visible = state.items.filter(
			entry =>
				(category.value === 'all' || entry.category === category.value) &&
				(!warehouse ||
					!query ||
					entry.name.toLocaleLowerCase().includes(query) ||
					String(entry.ID).includes(query))
		);
		for (const item of visible) {
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
			node.setAttribute(
				'aria-pressed',
				String(
					selected?.index === item.index && selected?.ID === item.ID && selected?.identity === item.identity
				)
			);
			setListItemText(node, item.name, `×${item.count}`);
			node.querySelector('img').hidden = !item.icon;
			node.querySelector('img').alt = '';
			if (item.icon && node.querySelector('img').getAttribute('src') !== item.icon)
				node.querySelector('img').src = item.icon;
			node.disabled = !state.allowed || state.pending;
		}
		for (const [key, node] of nodes)
			if (!keys.has(key)) {
				node.remove();
				nodes.delete(key);
			}
		let empty = $('.container-empty');
		if (!visible.length && !empty) {
			empty = document.createElement('p');
			empty.className = 'container-empty';
			$('.inventory-list').append(empty);
		}
		if (visible.length) empty?.remove();
		else
			empty.textContent = unavailable
				? `${labels[source]}当前不可用`
				: state.items.length
					? '没有符合条件的物品'
					: '这里没有可转移的物品';
		const item = visible.find(
			entry =>
				entry.index === selected?.index && entry.ID === selected?.ID && entry.identity === selected?.identity
		);
		if (selected && !item) reset();
		else if (item) {
			$('.container-item-count').textContent = `当前数量：${item.count}`;
			$('.inventory-detail input').max = String(item.count);
			const destination = $('.inventory-detail select'),
				value = destination.value;
			const destinations = targets();
			if ([...destination.options].map(option => option.value).join(',') !== destinations.join(',')) {
				destination.replaceChildren(...destinations.map(key => new Option(labels[key], key)));
				if (destinations.includes(value)) destination.value = value;
			}
		}
		for (const node of footer.querySelectorAll('button'))
			node.disabled = !state.allowed || state.pending || unavailable || !$('.inventory-detail select')?.value;
		for (const node of $('.inventory-detail').querySelectorAll('button,input,select'))
			node.disabled = !state.allowed || state.pending || unavailable;
	}
	reset();
	update();
	return { update };
}
