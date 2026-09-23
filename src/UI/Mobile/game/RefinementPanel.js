export function createRefinementPanel(body, service) {
	body.innerHTML =
		'<div class="inventory-layout"><div class="inventory-list" aria-label="可强化装备"></div><section class="inventory-detail" aria-label="强化详情"></section></div><p role="status"></p>';
	const $ = selector => body.querySelector(selector),
		list = $('.inventory-list'),
		detail = $('.inventory-detail'),
		nodes = new Map();
	let key = '';
	function update() {
		const state = service.snapshot();
		$('[role=status]').textContent = state.message;
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
					const current = service.snapshot().items.find(entry => entry.index === item.index);
					const error = current ? service.select(current.index, current.ID) : '装备已经变化';
					if (error) $('[role=status]').textContent = error;
					key = '';
					update();
				};
				nodes.set(item.index, button);
				list.append(button);
			}
			button.textContent = item.name;
			button.disabled = !state.allowed;
		}
		const next = JSON.stringify([
			state.selected,
			state.offer,
			state.pending,
			state.allowed,
			state.zeny,
			state.materials
		]);
		if (key === next) return;
		key = next;
		detail.replaceChildren();
		if (!state.offer) {
			detail.textContent = state.message;
			return;
		}
		const warning = document.createElement('p');
		warning.textContent = '强化会消耗材料与 Zeny，失败可能降低等级或损坏装备。';
		const materials = document.createElement('select');
		materials.setAttribute('aria-label', '强化材料');
		for (const material of state.materials)
			materials.add(
				new Option(
					`${material.name} × ${material.amount ?? 1} · ${material.zeny ?? material.price} Zeny · 持有 ${material.owned}`,
					material.index
				)
			);
		const chance = document.createElement('p');
		const blessing = document.createElement('input');
		blessing.type = 'number';
		blessing.min = '0';
		blessing.step = '1';
		blessing.value = '0';
		blessing.setAttribute('aria-label', '祝福次数');
		let protection;
		if (state.kind === 'refine') {
			blessing.type = 'checkbox';
			blessing.setAttribute('aria-label', '使用铁匠的祝福');
			blessing.disabled = !state.offer.blacksmithBlessing;
			protection = `使用铁匠的祝福：${state.offer.blacksmithBlessing || 0} 个`;
		} else {
			blessing.max = state.offer.blessing_info?.max_blessing || 0;
			protection = `祝福次数（每次消耗 ${state.offer.blessing_info?.amount || 0} 个，最多 ${blessing.max} 次）`;
		}
		const label = document.createElement('label');
		label.textContent = protection;
		label.append(blessing);
		const confirm = document.createElement('button');
		confirm.textContent = '核对强化';
		let reviewed = '';
		function selected() {
			return {
				material: Number(materials.value),
				blessing:
					state.kind === 'refine'
						? blessing.checked
							? state.offer.blacksmithBlessing
							: 0
						: Number(blessing.value)
			};
		}
		function details() {
			const material = state.materials.find(row => row.index === Number(materials.value));
			chance.textContent =
				state.kind === 'refine'
					? `成功率：${material?.chance ?? 0}%`
					: `成功率：${Math.min(10000, (state.offer.success_chance || 0) + Number(blessing.value) * (state.offer.blessing_info?.bonus || 0)) / 100}% · 失败降级：${material?.downgrade || 0} · 可能损坏：${material?.breakable ? '是' : '否'}`;
			reviewed = '';
			confirm.textContent = '核对强化';
		}
		materials.onchange = details;
		blessing.onchange = details;
		details();
		confirm.disabled = !state.allowed || !state.materials.length;
		confirm.onclick = () => {
			const choice = selected(),
				signature = JSON.stringify(choice);
			if (reviewed !== signature) {
				reviewed = signature;
				confirm.textContent = '确认消耗并强化';
				return;
			}
			const error = service.confirm(choice.material, choice.blessing);
			if (error) {
				$('[role=status]').textContent = error;
				return;
			}
			key = '';
			update();
		};
		detail.append(warning, materials, chance, label, confirm);
	}
	update();
	return { update };
}
