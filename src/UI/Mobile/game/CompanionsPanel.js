export function createCompanionsPanel(body, service) {
	body.innerHTML =
		'<dl data-info></dl><div class="social-form"><label>生命体名称<input data-companion-name maxlength="23"></label><div class="inventory-actions" data-actions></div></div><h3>技能</h3><p>主动技能可从战斗快捷栏的配置入口绑定。</p><div class="inventory-list" data-skills></div><p data-review></p><button data-confirm hidden>确认</button><button data-cancel hidden>取消</button><p role="status"></p>';
	const $ = selector => body.querySelector(selector);
	let gid,
		nameDirty = false,
		learning = null,
		skillKey = '',
		lastMessage = '';
	const labels = {
		feed: '喂食',
		rename: '改名',
		autofeed: '切换自动喂食',
		dismiss: '解除',
		return: '返回身边',
		aggressive: '切换主动攻击'
	};
	function cancel() {
		learning = null;
		service.cancel();
		$('[data-review]').textContent = '';
		$('[data-confirm]').hidden = $('[data-cancel]').hidden = true;
	}
	function review(text) {
		$('[data-review]').textContent = text;
		$('[data-confirm]').hidden = $('[data-cancel]').hidden = false;
	}
	for (const [action, label] of Object.entries(labels)) {
		if (service.snapshot().kind === 'mercenary' && ['feed', 'rename', 'autofeed'].includes(action)) continue;
		const button = document.createElement('button');
		button.textContent = label;
		button.dataset.action = action;
		button.onclick = () => {
			cancel();
			const error = service.prepare(action, action === 'rename' ? $('[data-companion-name]').value : undefined);
			if (error) {
				$('[role=status]').textContent = error;
				return;
			}
			review(
				action === 'dismiss'
					? service.snapshot().kind === 'homunculus'
						? '永久删除当前生命体？此操作无法撤销。'
						: '提前解除佣兵契约？'
					: `确认${label}？${action === 'feed' ? '将消耗食物，过度喂食可能降低亲密度。' : ''}`
			);
		};
		$('[data-actions]').append(button);
	}
	$('[data-companion-name]').oninput = () => {
		nameDirty = true;
		cancel();
	};
	$('[data-cancel]').onclick = cancel;
	$('[data-confirm]').onclick = () => {
		const requested = learning;
		learning = null;
		$('[role=status]').textContent = requested
			? requested.gid === service.snapshot().gid
				? service.learn(requested.id, requested.level)
				: '伴侣已变化，请重新确认'
			: service.confirm();
		cancel();
		update();
	};
	function update() {
		const s = service.snapshot(),
			info = s.info;
		if (gid !== s.gid) {
			gid = s.gid;
			nameDirty = false;
			cancel();
		}
		if (!s.allowed) cancel();
		if (!nameDirty) $('[data-companion-name]').value = info?.szName || '';
		$('[data-companion-name]').parentElement.hidden = s.kind !== 'homunculus';
		$('[data-companion-name]').disabled = !s.allowed || Boolean(info?.bModified);
		const rows = info
			? [
					['名称', s.kind === 'homunculus' ? info.szName : info.name],
					['等级', s.kind === 'homunculus' ? info.nLevel : info.level],
					['HP', `${info.hp ?? 0} / ${info.maxHP ?? 0}`],
					['SP', `${info.sp ?? 0} / ${info.maxSP ?? 0}`],
					['攻击模式', s.aggressive ? '主动攻击' : '被动攻击'],
					...(s.kind === 'homunculus'
						? [
								['饱食度', info.nFullness],
								['亲密度', info.nRelationship],
								['技能点', info.SKPoint],
								['经验', `${info.exp ?? 0} / ${info.maxEXP ?? 0}`],
								['自动喂食', s.autoFeed ? '开启' : '关闭']
							]
						: [
								['忠诚度', info.faith],
								['击杀数', info.approval_monster_kill_counter],
								['召唤次数', info.toal_call_num],
								[
									'契约到期',
									info.ExpireDate ? new Date(info.ExpireDate * 1000).toLocaleString('zh-CN') : '—'
								]
							])
				]
			: [['状态', '暂无已召出的伴侣']];
		$('[data-info]').replaceChildren();
		for (const [label, value] of rows) {
			const dt = document.createElement('dt'),
				dd = document.createElement('dd');
			dt.textContent = label;
			dd.textContent = value ?? '—';
			$('[data-info]').append(dt, dd);
		}
		for (const b of body.querySelectorAll('[data-action]'))
			b.disabled = !s.allowed || (b.dataset.action === 'rename' && Boolean(info?.bModified));
		const key = JSON.stringify(s.skills);
		if (key !== skillKey) {
			skillKey = key;
			$('[data-skills]').replaceChildren();
			for (const skill of s.skills) {
				const entry = document.createElement('div'),
					button = document.createElement('button');
				entry.textContent = `${skill.name} · Lv.${skill.level} · ${skill.type ? '主动' : '被动'} `;
				button.textContent = '学习一级';
				button.disabled = !skill.learnable;
				button.onclick = () => {
					cancel();
					learning = { id: skill.SKID, level: skill.level + 1, gid: s.gid };
					review(`消耗 1 点技能点，将「${skill.name}」提升至 Lv.${skill.level + 1}？`);
				};
				entry.append(button);
				$('[data-skills]').append(entry);
			}
		}
		if (lastMessage !== s.message) {
			lastMessage = s.message;
			$('[role=status]').textContent = s.message;
		}
	}
	update();
	return { update };
}
