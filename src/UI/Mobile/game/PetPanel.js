export function createPetPanel(body, service) {
	body.innerHTML =
		'<button data-refresh>刷新宠物状态</button><dl data-info></dl><div class="social-form"><label>宠物名称<input data-name maxlength="23"></label><div class="inventory-actions" data-actions></div></div><div data-evolution></div><p data-review></p><button data-confirm hidden>确认</button><button data-cancel hidden>取消</button><p role="status"></p>';
	const $ = selector => body.querySelector(selector);
	let review = null,
		lastPet = null,
		evoKey = '',
		lastMessage = '',
		nameDirty = false;
	function cancel() {
		review = null;
		$('[data-review]').textContent = '';
		$('[data-confirm]').hidden = true;
		$('[data-cancel]').hidden = true;
	}
	function prepare(action, value, label) {
		review = { action, value, pet: service.snapshot().gid };
		$('[data-review]').textContent = label;
		$('[data-confirm]').hidden = false;
		$('[data-cancel]').hidden = false;
	}
	for (const [action, label] of [
		['feed', '喂食'],
		['perform', '表演'],
		['egg', '收回为宠物蛋'],
		['unequip', '卸下饰品'],
		['rename', '改名'],
		['autofeed', '切换自动喂食']
	]) {
		const b = document.createElement('button');
		b.type = 'button';
		b.textContent = label;
		b.dataset.action = action;
		b.onclick = () => {
			prepare(
				action,
				action === 'rename' ? $('[data-name]').value : undefined,
				`${label}${action === 'rename' ? '为「' + $('[data-name]').value + '」' : ''}？${action === 'feed' ? '将使用宠物食物，过度喂食可能降低亲密度。' : ''}`
			);
		};
		$('[data-actions]').append(b);
	}
	$('[data-refresh]').onclick = () => {
		cancel();
		service.refresh();
		update();
	};
	$('[data-name]').oninput = () => {
		nameDirty = true;
		cancel();
	};
	$('[data-cancel]').onclick = cancel;
	$('[data-confirm]').onclick = () => {
		if (!review) return;
		const { action, value, pet } = review;
		cancel();
		if (service.snapshot().gid !== pet) {
			$('[role=status]').textContent = '宠物已变化，请重新确认';
			return;
		}
		$('[role=status]').textContent = service.command(action, value);
		update();
	};
	function update() {
		const state = service.snapshot(),
			info = state.info;
		const rows = info
			? [
					['名称', info.szName],
					['等级', info.nLevel],
					['饱食度', `${info.nFullness} / 100`],
					['亲密度', info.nRelationship],
					['饰品', state.accessory ? '已装备' : '未装备'],
					['自动喂食', state.autoFeed ? '已开启' : '未开启']
				]
			: [['状态', '暂无已召唤的宠物']];
		$('[data-info]').replaceChildren();
		for (const [label, value] of rows) {
			const dt = document.createElement('dt'),
				dd = document.createElement('dd');
			dt.textContent = label;
			dd.textContent = value;
			$('[data-info]').append(dt, dd);
		}
		if (lastPet !== state.gid) {
			lastPet = state.gid;
			nameDirty = false;
			cancel();
		}
		if (!nameDirty) $('[data-name]').value = info?.szName || '';
		const nextKey = JSON.stringify(state.evolutions);
		if (nextKey !== evoKey) {
			evoKey = nextKey;
			$('[data-evolution]').replaceChildren();
			for (const evo of state.evolutions) {
				const title = document.createElement('h3');
				title.textContent = `进化为 ${evo.name}`;
				$('[data-evolution]').append(title);
				for (const mat of evo.materials) {
					const p = document.createElement('p');
					p.textContent = `${mat.name}：${mat.owned} / ${mat.count}`;
					$('[data-evolution]').append(p);
				}
				const b = document.createElement('button');
				b.type = 'button';
				b.textContent = '进化为 ' + evo.name;
				b.onclick = () => prepare('evolve', evo.egg, '确认消耗上述材料，将宠物进化为 ' + evo.name + '？');
				$('[data-evolution]').append(b);
			}
		}
		for (const button of body.querySelectorAll('button')) button.disabled = !state.allowed;
		$('[data-refresh]').disabled = !state.canRefresh;
		$('[data-name]').disabled = !state.allowed || Boolean(info?.bModified);
		$('[data-action=rename]').disabled = !state.allowed || Boolean(info?.bModified);
		$('[data-action=unequip]').disabled = !state.allowed || !state.accessory;
		if (lastMessage !== state.message) {
			lastMessage = state.message;
			$('[role=status]').textContent = state.message;
		}
	}
	update();
	return { update };
}
