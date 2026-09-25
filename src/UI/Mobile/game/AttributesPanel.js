import { createPointResetControl } from './PointResetControl.js';

export function createAttributesPanel(body, actions) {
	body.innerHTML =
		'<div class="attribute-toolbar"><div class="attribute-tabs" role="group" aria-label="素质分类"></div><strong data-attribute-points></strong></div><div class="attribute-layout"><section class="attribute-allocation" aria-label="素质加点"></section><section class="attribute-results" aria-label="相关数值"><h3>相关数值</h3><p>加点后实时更新，箭头显示本次变化。</p><dl></dl></section></div><div class="attribute-footer"><p role="status" data-attribute-status></p></div>';
	const $ = selector => body.querySelector(selector);
	const toolbar = $('.attribute-toolbar');
	let active = 'base',
		state,
		rowKind;
	const rows = new Map(),
		results = new Map();
	const tabs = new Map();
	for (const [kind, label] of [
		['base', '基础素质'],
		['traits', '四转素质']
	]) {
		const tab = document.createElement('button');
		tab.type = 'button';
		tab.textContent = label;
		tab.onclick = () => {
			reset.cancel();
			active = kind;
			update();
		};
		tabs.set(kind, tab);
		$('.attribute-tabs').append(tab);
	}
	const reset = createPointResetControl($('.attribute-footer'), {
		label: '重置素质点',
		description: '确认重置当前标签页的六项素质并返还该类点数？另一类素质不受影响。',
		canReset: () => actions.snapshot().allowed,
		reset: () => actions.reset(active),
		changed: () => update()
	});
	function update() {
		if (!body.contains(toolbar)) return;
		state = actions.snapshot();
		if (!state.traits.enabled) active = 'base';
		tabs.get('traits').hidden = !state.traits.enabled;
		for (const [kind, tab] of tabs) {
			tab.setAttribute('aria-pressed', String(kind === active));
			tab.disabled = state.pending;
		}
		const section = state[active];
		$('[data-attribute-points]').textContent =
			`剩余${active === 'traits' ? '四转' : ''}素质点：${section.points ?? '—'}`;
		$('[data-attribute-status]').textContent = state.message;
		if (rowKind !== active) {
			rowKind = active;
			rows.clear();
			results.clear();
			$('.attribute-allocation').replaceChildren();
			$('.attribute-results dl').replaceChildren();
		}
		for (const stat of section.rows) {
			let row = rows.get(stat.key);
			if (!row) {
				row = document.createElement('div');
				row.className = 'attribute-row';
				row.dataset.attribute = stat.key;
				row.innerHTML =
					'<strong></strong><span class="attribute-value"></span><small></small><button type="button">＋1</button>';
				row.querySelector('strong').textContent = stat.label;
				const button = row.querySelector('button');
				button.setAttribute('aria-label', `${stat.label}增加 1 点`);
				button.onclick = () => {
					actions.increase(active, stat.key);
					update();
				};
				rows.set(stat.key, row);
				$('.attribute-allocation').append(row);
			}
			row.querySelector('.attribute-value').textContent =
				`${stat.value ?? '—'}${stat.bonus ? ` ${stat.bonus > 0 ? '+' : '−'} ${Math.abs(stat.bonus)}` : ''}`;
			row.querySelector('small').textContent =
				stat.cost === null ? '读取中' : stat.cost === 0 ? '已达上限' : `消耗 ${stat.cost} 点`;
			row.querySelector('button').disabled = !stat.canAdd;
		}
		for (const stat of state.related[active]) {
			let pair = results.get(stat.key);
			if (!pair) {
				const term = document.createElement('dt'),
					value = document.createElement('dd');
				term.textContent = stat.label;
				value.dataset.result = stat.key;
				$('.attribute-results dl').append(term, value);
				pair = value;
				results.set(stat.key, pair);
			}
			const changed = stat.previous !== undefined && stat.previous !== stat.value;
			pair.textContent = changed ? `${stat.previous} → ${stat.value}` : String(stat.value);
			pair.classList.toggle('attribute-changed', changed);
		}
		reset.update();
	}
	update();
	return { update };
}
