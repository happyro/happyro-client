import { createRefinementEquipmentBrowser } from './RefinementEquipmentBrowser.js';
import { createMenuField } from './MenuFormControls.js';
import { setListItemText, setListItemIcon } from './ListItemText.js';
import { interactionReview, interactionFooter } from './InteractionPanel.js';
import { confirmAction } from 'UI/Components/Confirmation.js';
import { createFeedback } from 'UI/Components/Feedback.js';

export function createEnchantPanel(body, service) {
	const browser = createRefinementEquipmentBrowser(body, () => update(), '附魔');
	const feedback = createFeedback(body);
	const list = body.querySelector('.inventory-list');
	const detail = body.querySelector('.inventory-detail');
	const { footer, status } = interactionFooter(body);
	status.hidden = true;
	const field = document.createElement('label');
	field.className = 'interaction-field refinement-material-field menu-labeled-select';
	const caption = document.createElement('span');
	caption.textContent = '方式';
	const select = createMenuField('select');
	select.setAttribute('aria-label', '附魔方式');
	field.append(caption, select);
	const next = document.createElement('button');
	next.textContent = '下一步';
	footer.append(field, next);
	const nodes = new Map();
	let choiceKey = '',
		editingId = '',
		renderKey = '';
	select.onchange = () => {
		choiceKey = select.value;
		update();
	};
	function update() {
		const state = service.snapshot();
		const items = browser.filter(state.items);
		const ids = new Set(items.map(item => item.index));
		for (const [id, node] of nodes)
			if (!ids.has(id)) {
				node.remove();
				nodes.delete(id);
			}
		list.querySelector('.menu-hint')?.remove();
		for (const item of items) {
			let button = nodes.get(item.index);
			if (!button) {
				button = document.createElement('button');
				button.className = 'inventory-item';
				button.onclick = () => {
					const current = service.snapshot().items.find(row => row.index === item.index);
					const error = current ? service.select(current.index, current.ID) : '装备已变化';
					if (error) return feedback(error, 'error');
					choiceKey = '';
					renderKey = '';
					update();
				};
				nodes.set(item.index, button);
				list.append(button);
			}
			setListItemText(button, item.name);
			setListItemIcon(button, item);
			button.disabled = !state.allowed;
			button.setAttribute('aria-pressed', String(state.selected?.index === item.index));
		}
		if (!items.length) {
			const hint = document.createElement('p');
			hint.className = 'menu-hint';
			hint.textContent = state.items.length ? '没有匹配的装备' : '暂无可附魔装备';
			list.append(hint);
		}
		const identity = JSON.stringify(state.selected);
		if (identity !== editingId) choiceKey = '';
		editingId = identity;
		if (!state.choices.some(choice => choice.key === choiceKey)) choiceKey = state.choices[0]?.key || '';
		const key = JSON.stringify([state, choiceKey]);
		if (key === renderKey) return;
		renderKey = key;
		select.replaceChildren();
		for (const choice of state.choices) select.add(new Option(choice.name, choice.key));
		if (!state.choices.length) select.add(new Option('无可用方式', ''));
		select.value = choiceKey;
		select.disabled = !state.allowed || !state.choices.length;
		const choice = state.choices.find(row => row.key === choiceKey);
		next.disabled = !state.allowed || !choice;
		detail.replaceChildren();
		const item = state.items.find(row => row.index === state.selected?.index);
		const title = document.createElement('h3');
		title.textContent = item?.name || '请选择装备';
		detail.append(title);
		if (!choice) {
			const hint = document.createElement('p');
			hint.className = 'menu-hint';
			hint.textContent = state.selected ? '此装备暂无可用附魔方式' : state.message || '选择装备查看附魔配置';
			detail.append(hint);
			return;
		}
		const config = document.createElement('div');
		config.className = 'refinement-config';
		const cost = document.createElement('p');
		cost.className = 'item-description';
		cost.textContent = [
			...choice.materials.map(
				material =>
					`材料：${material.name} × ${material.count}\n拥有：${state.materialCounts?.[material.ITID] ?? 0}`
			),
			`费用：${choice.zeny} Z`,
			`余额：${state.zeny ?? 0} Z`
		].join('\n');
		const chance = document.createElement('p');
		const percentage = document.createElement('strong');
		percentage.className = 'refinement-success-rate';
		percentage.textContent = `${choice.rate / 1000}%`;
		chance.append('成功率：', percentage);
		const warning = document.createElement('p');
		warning.className = 'interaction-warning';
		warning.textContent =
			choice.action === 'reset'
				? '重置成功会清除现有附魔，费用与材料会消耗。'
				: '附魔会消耗费用与材料，请核对所选方式。';
		config.append(cost, chance);
		if (choice.results?.length) {
			const outcomes = document.createElement('p');
			outcomes.textContent = `可能获得：${choice.results.join('、')}`;
			config.append(outcomes);
		}
		config.append(warning);
		detail.append(config);
		next.onclick = () => {
			const signature = JSON.stringify(choice);
			const selectedIdentity = JSON.stringify(state.selected);
			const content = interactionReview(
				[`装备：${item?.name || '已选装备'}`, `方式：${choice.name}`, cost.textContent, chance.textContent],
				`费用：${choice.zeny} Z`,
				warning.textContent
			);
			confirmAction(
				body,
				choice.action === 'reset' ? '确认重置附魔？' : '确认附魔？',
				() => {
					if (JSON.stringify(service.snapshot().selected) !== selectedIdentity)
						return feedback('装备已变化，请重新核对', 'error');
					const error = service.confirm(choice.key, signature);
					if (error) feedback(error, 'error');
					update();
				},
				{ content }
			);
		};
	}
	update();
	return { update };
}
