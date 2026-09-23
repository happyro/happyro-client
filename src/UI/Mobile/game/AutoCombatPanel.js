/** Auto combat configuration is independent of the manual shortcut slots. */
export function createAutoCombatPanel(body, actions) {
	const state = actions.snapshot();
	body.innerHTML = `
		<div class="auto-layout">
			<section class="auto-target-section" aria-labelledby="auto-target-title">
				<h3 id="auto-target-title">攻击目标</h3>
				<button type="button" data-all-species>全部魔物</button>
				<p class="auto-help">可多选种类；未勾选时攻击全部魔物。</p>
				<div class="auto-species-list" data-auto-species aria-label="自动战斗目标"></div>
				<p class="auto-help">击败后继续寻找附近目标，没有目标时原地等待。</p>
				<p class="auto-help">手动移动或施法会停止自动战斗。</p>
			</section>
			<section class="auto-skill-section" aria-labelledby="auto-skills-title">
				<div class="auto-section-heading"><h3 id="auto-skills-title">攻击方式</h3><span data-skill-count></span></div>
				<button type="button" data-normal-attack>普通攻击</button>
				<p class="auto-help">勾选技能后随机释放，使用已学最高等级；均不可用时使用普攻。</p>
				<div class="auto-skill-list" data-auto-skills></div>
			</section>
		</div>
		<div class="auto-config-footer"><div><strong data-auto-summary></strong><span role="status" data-auto-feedback>修改后点击保存生效</span></div><button type="button" data-save-auto>保存配置</button></div>`;
	const $ = selector => body.querySelector(selector);
	const species = new Map(state.species.map(entry => [entry.id, entry.name]));
	for (const target of actions.targets()) species.set(target.species, target.name);
	const chosenSpecies = new Set(state.species.map(entry => entry.id));
	for (const [id, name] of species) {
		// One native button owns activation; there is no nested label/control activation.
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'auto-species-card';
		button.dataset.species = String(id);
		button.setAttribute('role', 'checkbox');
		button.setAttribute('aria-checked', String(chosenSpecies.has(id)));
		const check = document.createElement('span');
		check.className = 'auto-species-check';
		check.setAttribute('aria-hidden', 'true');
		const title = document.createElement('span');
		title.textContent = name;
		button.append(check, title);
		const toggle = () => {
			if (chosenSpecies.has(id)) chosenSpecies.delete(id);
			else chosenSpecies.add(id);
			updateSummary(true);
		};
		let press = null;
		const scroller = $('.auto-target-section');
		button.onpointerdown = event => {
			if (event.button !== 0 || press) return;
			// Avoid focus scrolling the list between press and release.
			event.preventDefault();
			press = {
				id: event.pointerId,
				x: event.clientX,
				y: event.clientY,
				scroll: scroller.scrollTop,
				moved: false
			};
			button.setPointerCapture(event.pointerId);
		};
		button.onpointermove = event => {
			if (press?.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8)
				press.moved = true;
		};
		button.onpointerup = event => {
			if (press?.id !== event.pointerId) return;
			const start = press;
			press = null;
			const bounds = button.getBoundingClientRect();
			if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
			if (
				!start.moved &&
				Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 8 &&
				scroller.scrollTop === start.scroll &&
				event.clientX >= bounds.left &&
				event.clientX <= bounds.right &&
				event.clientY >= bounds.top &&
				event.clientY <= bounds.bottom
			)
				toggle();
		};
		button.onpointercancel = button.onlostpointercapture = () => {
			press = null;
		};
		// Pointer activation is handled once above. Keep keyboard/assistive activation native.
		button.onclick = event => {
			if (event.detail === 0) toggle();
		};
		$('[data-auto-species]').append(button);
	}
	if (!species.size) $('[data-auto-species]').textContent = '附近暂无魔物，发现后可在这里选择。';
	const selectedSpecies = () => [...chosenSpecies].map(id => ({ id, name: species.get(id) }));
	const entries = actions.skills();
	for (const skill of entries) {
		const label = document.createElement('label');
		label.className = 'auto-skill-card';
		const input = document.createElement('input');
		input.type = 'checkbox';
		input.value = String(skill.id);
		input.checked = state.skills.includes(skill.id);
		const detail = document.createElement('span');
		const name = document.createElement('strong');
		name.textContent = skill.name;
		const level = document.createElement('small');
		level.textContent = `Lv.${skill.level}`;
		detail.append(name, level);
		if (skill.reason) {
			const reason = document.createElement('small');
			reason.className = 'auto-skill-reason';
			reason.textContent = skill.reason;
			detail.append(reason);
		}
		label.append(input, detail);
		$('[data-auto-skills]').append(label);
	}
	if (!entries.length) $('[data-auto-skills]').textContent = '暂无可自动释放的技能，使用普通攻击。';
	const selectedSkills = () =>
		[...body.querySelectorAll('[data-auto-skills] input:checked')].map(input => Number(input.value));
	function updateSummary(changed = false) {
		const count = selectedSkills().length;
		const targets = selectedSpecies();
		for (const button of body.querySelectorAll('[data-species]'))
			button.setAttribute('aria-checked', String(chosenSpecies.has(Number(button.dataset.species))));
		const targetLabel = targets.length > 1 ? `${targets.length} 种魔物` : targets[0]?.name || '全部魔物';
		$('[data-all-species]').setAttribute('aria-pressed', String(!targets.length));
		$('[data-normal-attack]').setAttribute('aria-pressed', String(count === 0));
		$('[data-skill-count]').textContent = count ? `已选 ${count} 项` : '未选技能';
		$('[data-auto-summary]').textContent = `${targetLabel} · ${count ? `${count} 个技能` : '普通攻击'}`;
		if (changed) $('[data-auto-feedback]').textContent = '有未保存的修改';
	}
	$('[data-all-species]').onclick = () => {
		chosenSpecies.clear();
		updateSummary(true);
	};
	$('[data-auto-skills]').onchange = () => updateSummary(true);
	$('[data-normal-attack]').onclick = () => {
		for (const input of body.querySelectorAll('[data-auto-skills] input')) input.checked = false;
		updateSummary(true);
	};
	function save() {
		actions.configure(selectedSpecies(), selectedSkills());
		actions.close();
	}
	$('[data-save-auto]').onclick = save;
	updateSummary();
}
