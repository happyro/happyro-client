import { confirmAction } from 'UI/Components/Confirmation.js';
import { createFeedback } from 'UI/Components/Feedback.js';
import { interactionReview, interactionFooter, inputDraft } from './InteractionPanel.js';
export function createMaterialsPanel(body, service) {
	body.innerHTML =
		'<div class="inventory-layout"><div class="inventory-list" aria-label="材料列表"></div><section class="inventory-detail" aria-label="材料详情"></section></div>';
	const $ = selector => body.querySelector(selector);
	const { footer, status } = interactionFooter(body);
	const feedback = createFeedback(body),
		nodes = new Map();
	let selected, draft, input, title, description, revert, state;
	const keyOf = item => `${item.index}:${item.ID}`;
	const review = button('核对材料', () => {
		update();
		if (!ready() || !state.allowed || !state.order.length) return;
		const signature = JSON.stringify(state.order);
		const content = interactionReview(
			state.order.map(row => `${row.name} × ${row.count}${row.description ? '\n' + row.description : ''}`),
			`共 ${state.order.length} 种材料`,
			'确认后会消耗材料或改变物品，请核对数量与结果。'
		);
		confirmAction(
			body,
			'确认提交以下材料？',
			() => {
				if (JSON.stringify(service.snapshot().order) !== signature) {
					feedback('材料已变化，请重新核对', 'error');
					return;
				}
				const error = service.confirm();
				if (error) feedback(error, 'error');
				update();
			},
			{ content }
		);
	});
	const clear = button('清空材料', () => {
		service.clear();
		selected = null;
		draft = null;
		update();
	});
	footer.append(review, clear);
	function button(text, action) {
		const b = document.createElement('button');
		b.type = 'button';
		b.textContent = text;
		b.onclick = action;
		return b;
	}
	function ready() {
		if (!draft?.dirty()) return true;
		feedback('数量尚未加入材料，请先加入或撤销修改', 'error');
		draft.focus();
		return false;
	}
	function select(item) {
		if (!ready()) return;
		selected = keyOf(item);
		title = document.createElement('h3');
		description = document.createElement('p');
		description.className = 'item-description';
		const form = document.createElement('form');
		form.className = 'interaction-form';
		const label = document.createElement('label');
		label.textContent = '材料数量';
		input = document.createElement('input');
		input.type = 'number';
		input.min = 0;
		input.step = 1;
		input.required = true;
		input.setAttribute('aria-label', '材料数量');
		input.value = String(state.order.find(row => row.index === item.index)?.count ?? item.requiredCount ?? 1);
		label.append(input);
		const save = button('加入材料', () => {});
		save.type = 'submit';
		revert = button('撤销修改', () => draft.reset());
		form.append(label, save, revert);
		form.onsubmit = event => {
			event.preventDefault();
			if (!input.reportValidity()) return;
			const error = service.set(item.index, item.ID, Number(input.value));
			if (error) feedback(error, 'error');
			else {
				draft.accept();
				feedback('材料已更新', 'success');
			}
			update();
		};
		$('.inventory-detail').replaceChildren(title, form, description);
		draft = inputDraft([input], update);
		update();
	}
	function update() {
		state = service.snapshot();
		status.textContent = state.pending
			? '等待服务器回复…'
			: draft?.dirty()
				? '数量已修改，尚未加入材料'
				: state.message || `已选 ${state.order.length} 种材料`;
		clear.disabled = !state.allowed;
		review.disabled = !state.allowed || (!state.order.length && !draft?.dirty());
		const keys = new Set(state.items.map(keyOf));
		for (const [key, node] of nodes)
			if (!keys.has(key)) {
				node.remove();
				nodes.delete(key);
			}
		for (const item of state.items) {
			const key = keyOf(item);
			let node = nodes.get(key);
			if (!node) {
				node = button('', () => {
					const live = service.snapshot().items.find(row => keyOf(row) === key);
					if (live) select(live);
				});
				node.className = 'inventory-item';
				nodes.set(key, node);
				$('.inventory-list').append(node);
			}
			const count = state.order.find(row => row.index === item.index)?.count;
			node.textContent = `${item.name} × ${item.count}${count ? ' · 已选 ' + count : ''}`;
			node.disabled = !state.allowed;
			node.setAttribute('aria-pressed', String(selected === key));
		}
		const item = state.items.find(row => keyOf(row) === selected);
		if (!item) {
			selected = null;
			draft = null;
			$('.inventory-detail').textContent = state.items.length
				? state.instruction || '点选物品，输入数量后加入材料'
				: '没有可用材料';
		} else {
			title.textContent = item.name;
			description.textContent = item.description || '';
			input.max = String(item.count);
			revert.hidden = !draft?.dirty();
			for (const control of $('.inventory-detail').querySelectorAll('button,input'))
				control.disabled = !state.allowed;
		}
	}
	update();
	return { update };
}
