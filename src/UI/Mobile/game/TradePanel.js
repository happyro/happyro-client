export function createTradePanel(body, service) {
	body.innerHTML =
		'<div class="inventory-layout"><div class="inventory-list" aria-label="可交易物品"></div><section class="inventory-detail"><div data-picker></div><label>Zeny <input data-money type="number" min="0" step="1" value="0"></label><button data-send-money>设置金额</button><h3>我方报价</h3><div data-own></div><h3>对方报价</h3><div data-peer></div><p data-phase></p><button data-lock>锁定报价</button><button data-execute>确认成交</button><button data-cancel>取消交易</button></section></div><p role="status"></p>';
	const $ = selector => body.querySelector(selector),
		nodes = new Map();
	let preview = null;
	let selected = null,
		pickerKey = '',
		confirm = false;
	function action(result) {
		$('[role=status]').textContent = result;
		confirm = false;
		update();
	}
	$('[data-send-money]').onclick = () => action(service.setMoney(Number($('[data-money]').value)));
	$('[data-lock]').onclick = () => action(service.lock());
	$('[data-execute]').onclick = () => {
		if (!confirm) {
			confirm = true;
			$('[data-execute]').textContent = '再次确认成交';
			return;
		}
		action(service.execute());
	};
	$('[data-cancel]').onclick = () => action(service.cancel());
	function update() {
		const state = service.snapshot();
		const active = state.allowed && !state.pending;
		for (const [id, node] of nodes)
			if (!state.items.some(item => item.index === id)) {
				node.remove();
				nodes.delete(id);
			}
		for (const item of state.items) {
			let node = nodes.get(item.index);
			if (!node) {
				node = document.createElement('button');
				node.className = 'inventory-item';
				node.onclick = () => {
					selected = item.index;
					preview = null;
					pickerKey = '';
					update();
				};
				nodes.set(item.index, node);
				$('.inventory-list').append(node);
			}
			node.textContent = `${item.name} × ${item.count}`;
			node.setAttribute('aria-pressed', String(selected === item.index));
		}
		const item = preview
			? state[preview.side].find(entry => entry.index === preview.index)
			: state.items.find(entry => entry.index === selected);
		const key = JSON.stringify([item && { ...item, icon: undefined }, active, state.ownLocked, preview]);
		if (key !== pickerKey) {
			pickerKey = key;
			const picker = $('[data-picker]');
			picker.replaceChildren();
			if (item) {
				const text = document.createElement('p');
				text.textContent = item.description;
				const input = document.createElement('input');
				input.type = 'number';
				input.min = '1';
				input.max = String(item.count);
				input.value = '1';
				input.setAttribute('aria-label', '交易数量');
				const button = document.createElement('button');
				button.textContent = '加入交易';
				button.disabled = !active || state.ownLocked;
				button.onclick = () => action(service.add(item.index, item.identity, Number(input.value)));
				if (preview) picker.append(text);
				else picker.append(text, input, button);
			} else picker.textContent = '点击左侧物品设置数量';
		}
		for (const [selector, side, money] of [
			['[data-own]', 'offered', state.money],
			['[data-peer]', 'received', state.peerMoney]
		]) {
			const parent = $(selector),
				rows = state[side];
			const signature = JSON.stringify([
				money,
				rows.map(({ index, name, count, description }) => ({ index, name, count, description }))
			]);
			if (parent.dataset.signature === signature) continue;
			parent.dataset.signature = signature;
			parent.textContent = `${money} Zeny`;
			for (const entry of rows) {
				const button = document.createElement('button');
				button.textContent = `查看：${entry.name} × ${entry.count}`;
				button.onclick = () => {
					preview = { side, index: entry.index };
					selected = null;
					pickerKey = '';
					confirm = false;
					update();
					$('[data-picker]').scrollIntoView({ block: 'nearest' });
				};
				parent.append(button);
			}
		}
		$('[data-phase]').textContent = state.status;
		$('[data-money]').disabled = !active || state.ownLocked;
		$('[data-send-money]').disabled = !active || state.ownLocked;
		$('[data-lock]').disabled = !active || state.ownLocked;
		$('[data-execute]').disabled = !active || !state.ownLocked || !state.peerLocked;
		if (!confirm) $('[data-execute]').textContent = '确认成交';
		$('[data-cancel]').disabled = !state.allowed;
	}
	update();
	return { update };
}
