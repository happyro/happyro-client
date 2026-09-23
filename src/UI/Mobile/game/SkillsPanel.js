export function createSkillsPanel(body, actions) {
	body.innerHTML =
		'<div class="skills-toolbar"><strong data-skill-points></strong><select aria-label="技能分类"><option value="all">全部技能</option><option value="active">已学主动</option><option value="passive">已学被动</option><option value="locked">未学习</option></select></div><div class="inventory-layout"><div class="inventory-list" aria-label="技能列表"></div><section class="inventory-detail" aria-label="技能详情"></section></div><p role="status" data-skill-status></p>';
	const $ = selector => body.querySelector(selector),
		list = $('.inventory-list'),
		detail = $('.inventory-detail');
	let selected = null,
		key = '',
		state;
	const nodes = new Map();
	function button(text, fn) {
		const b = document.createElement('button');
		b.type = 'button';
		b.textContent = text;
		b.onclick = fn;
		return b;
	}
	function status(text) {
		$('[data-skill-status]').textContent = text;
	}
	function renderDetail() {
		const skill = state.skills.find(entry => entry.id === selected);
		if (!skill) {
			detail.textContent = '点击技能查看说明、学习或设置快捷槽';
			return;
		}
		const next = JSON.stringify({ ...skill, icon: undefined });
		if (next === key) return;
		key = next;
		detail.replaceChildren();
		const title = document.createElement('h3');
		title.textContent = skill.name;
		const summary = document.createElement('p');
		summary.textContent = `${skill.kind} · 等级 ${skill.level}/${skill.max}`;
		const learn = button(skill.level ? '升级一级' : '学习一级', () => {
			learn.disabled = true;
			const confirm = button(`确认消耗 1 技能点，学习到 ${skill.level + 1} 级`, () => {
				status(actions.learn(skill.id, skill.level + 1));
				key = '';
				update();
			});
			const cancel = button('取消学习', () => {
				key = '';
				renderDetail();
			});
			learn.after(confirm, cancel);
		});
		learn.disabled = !skill.learnable;
		detail.append(title, summary, learn);
		if (skill.active) {
			const level = document.createElement('select');
			level.setAttribute('aria-label', '施放等级');
			for (let i = 1; i <= skill.level; i++) level.add(new Option(`Lv.${i}`, String(i)));
			level.value = String(skill.level);
			const slot = document.createElement('select');
			slot.setAttribute('aria-label', '技能快捷槽');
			const page = actions.shortcuts();
			for (let i = 0; i < page.total; i++)
				slot.add(new Option(`槽位 ${i + 1} · ${actions.slotName(i)}`, String(i)));
			slot.value = String(page.slots[0].index);
			detail.append(
				level,
				slot,
				button('确认设置快捷槽', () =>
					status(
						actions.bind(skill.id, Number(level.value), Number(slot.value))
							? '快捷槽已设置'
							: '设置失败，请重新选择'
					)
				)
			);
		}
		const requirements = document.createElement('p');
		requirements.textContent = `前置技能：${skill.requirements.join('；') || '无'}${skill.reason ? '\n' + skill.reason : ''}`;
		const description = document.createElement('p');
		description.className = 'item-description';
		description.textContent = skill.description;
		detail.append(requirements, description);
	}
	function render() {
		$('[data-skill-points]').textContent = `剩余技能点：${state.points}`;
		const category = $('select').value;
		const filtered = state.skills.filter(
			skill =>
				category === 'all' ||
				(category === 'active' ? skill.active : category === 'passive' ? skill.kind === '被动' : !skill.level)
		);
		const ids = new Set(filtered.map(skill => skill.id));
		for (const [id, node] of nodes)
			if (!ids.has(id)) {
				node.remove();
				nodes.delete(id);
			}
		for (const skill of filtered) {
			let node = nodes.get(skill.id);
			if (!node) {
				node = button('', () => {
					selected = skill.id;
					key = '';
					status('');
					render();
					detail.scrollTop = 0;
				});
				node.className = 'inventory-item';
				node.dataset.skill = skill.id;
				node.append(document.createElement('img'), document.createElement('span'));
				nodes.set(skill.id, node);
				list.append(node);
			}
			node.setAttribute('aria-pressed', String(selected === skill.id));
			node.querySelector('span').textContent = `${skill.name} · ${skill.kind} Lv.${skill.level}`;
			const img = node.querySelector('img');
			img.alt = '';
			if (skill.icon && img.getAttribute('src') !== skill.icon) img.src = skill.icon;
		}
		renderDetail();
	}
	$('select').onchange = render;
	function update() {
		state = actions.snapshot();
		render();
	}
	update();
	return { update };
}
