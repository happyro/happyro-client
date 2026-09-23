/** Auto combat configuration is independent of the five manual shortcut slots. */
export function createAutoCombatPanel(body, actions) {
	const state = actions.snapshot();
	body.innerHTML =
		'<p>在附近寻找目标，击败后继续寻找同类；没有目标时原地等待。手动移动或施法会停止自动战斗。</p><label class="auto-target-choice">目标种类 <select aria-label="自动战斗目标"></select></label><button type="button" data-pick-species>点选场景中的魔物</button><fieldset class="auto-skills"><legend>自动攻击技能</legend><p>未勾选时使用普通攻击。勾选多个技能时随机释放可用技能，均不可用时使用普通攻击。使用当前已学习的最高等级。</p><div data-auto-skills></div></fieldset><button type="button" data-save-auto>保存配置</button>';
	const select = body.querySelector('select');
	select.add(new Option('全部魔物', 'all'));
	const species = new Map();
	if (state.species) species.set(state.species.id, state.species.name);
	for (const target of actions.targets()) species.set(target.species, target.name);
	for (const [id, name] of species) select.add(new Option(name, String(id)));
	select.value = state.species ? String(state.species.id) : 'all';
	const entries = actions.skills();
	for (const skill of entries) {
		const label = document.createElement('label'),
			input = document.createElement('input');
		input.type = 'checkbox';
		input.value = String(skill.id);
		input.checked = state.skills.includes(skill.id);
		label.append(
			input,
			document.createTextNode(`${skill.name} Lv.${skill.level}${skill.reason ? `（${skill.reason}）` : ''}`)
		);
		body.querySelector('[data-auto-skills]').append(label);
	}
	if (!entries.length)
		body.querySelector('[data-auto-skills]').textContent = '尚未学习可自动释放的攻击或地面技能，当前使用普通攻击。';
	function save() {
		const id = select.value === 'all' ? null : Number(select.value);
		actions.configure(
			id === null ? null : { id, name: species.get(id) },
			[...body.querySelectorAll('input:checked')].map(input => Number(input.value))
		);
	}
	body.querySelector('[data-save-auto]').onclick = () => {
		save();
		actions.close();
	};
	body.querySelector('[data-pick-species]').onclick = () => {
		save();
		actions.close();
		actions.pickSpecies();
	};
}
