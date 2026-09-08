import { loadCurrentCharacter, maintainCurrentCharacter } from './AdventureControlService.js';
import escapeHtml from './escapeHtml.js';
import { requestGameToolsConfirmation } from './GameToolsConfirm.js';

const statFields = [
	['str', '力量'],
	['agi', '敏捷'],
	['vit', '体质'],
	['int', '智力'],
	['dex', '灵巧'],
	['luk', '幸运']
];

function changedValues(form, current) {
	return Object.fromEntries(
		new FormData(form).entries()
			.map(([key, value]) => [key, Number(value)])
			.filter(([key, value]) => value !== current[key])
	);
}

function mount(container) {
	container.classList.add('management-tab');
	let snapshot;
	let pending = false;

	async function load() {
		container.innerHTML = '<div class="management-loading">正在读取角色实时状态...</div>';
		try {
			snapshot = await loadCurrentCharacter();
			render();
		} catch (error) {
			container.innerHTML = `<div class="management-error">${escapeHtml(error.message)}</div>`;
		}
	}

	async function submit(type, payload, confirmation) {
		if (pending) return;
		if (confirmation && !(await requestGameToolsConfirmation(container, confirmation))) return;
		if ((type === 'character.progression.update' || type === 'character.stats.update') && !Object.keys(payload).length) {
			render('没有需要应用的修改');
			return;
		}
		pending = true;
		render('正在提交...');
		try {
			snapshot = await maintainCurrentCharacter(type, payload);
			render('操作成功，已读取最新状态');
		} catch (error) {
			render(error.message, true);
		} finally {
			pending = false;
			container.querySelectorAll('button, input').forEach(element => (element.disabled = false));
		}
	}

	function render(message = '', error = false) {
		container.innerHTML = `
			<div class="management-scroll">
				<header class="character-summary">
					<div><h3>${escapeHtml(snapshot.name)}</h3><p>职业 ID ${snapshot.job_id} · ${escapeHtml(snapshot.map)} (${snapshot.x}, ${snapshot.y})</p></div>
					<div><strong>HP ${snapshot.hp} / ${snapshot.max_hp}</strong><span>SP ${snapshot.sp} / ${snapshot.max_sp}${snapshot.max_ap ? ` · AP ${snapshot.ap} / ${snapshot.max_ap}` : ''}</span></div>
				</header>
				<div class="management-grid">
					<section>
						<h4>等级与职业</h4>
						<form data-form="progression" class="management-form">
							<label>基础等级<input name="base_level" type="number" min="1" max="${snapshot.max_base_level}" value="${snapshot.base_level}" required></label>
							<label>职业等级<input name="job_level" type="number" min="1" max="${snapshot.max_job_level}" value="${snapshot.job_level}" required></label>
							<label>职业 ID<input name="job_id" type="number" min="1" value="${snapshot.job_id}" required></label>
							<button type="submit">应用等级与职业</button>
						</form>
					</section>
					<section>
						<h4>基础属性 <small>剩余 ${snapshot.status_points} 点</small></h4>
						<form data-form="stats" class="management-form stat-form">
							${statFields.map(([key, label]) => `<label>${label}<input name="${key}" type="number" min="1" max="${snapshot.max_stat}" value="${snapshot[key]}" required></label>`).join('')}
							<button type="submit">应用属性</button>
						</form>
					</section>
				</div>
				<section class="maintenance-actions">
					<h4>快速维护</h4>
					<button type="button" data-action="vitals">恢复状态</button>
					<button type="button" data-action="stats-reset">重置属性</button>
					<button type="button" data-action="skills-reset">重置技能</button>
					<span>技能点 ${snapshot.skill_points}</span>
				</section>
				<div class="management-status${error ? ' error' : ''}">${escapeHtml(message)}</div>
			</div>`;

		container.querySelector('[data-form="progression"]').addEventListener('submit', event => {
			event.preventDefault();
			void submit('character.progression.update', changedValues(event.currentTarget, snapshot));
		});
		container.querySelector('[data-form="stats"]').addEventListener('submit', event => {
			event.preventDefault();
			void submit('character.stats.update', changedValues(event.currentTarget, snapshot));
		});
		container.querySelector('[data-action="vitals"]').addEventListener('click', () =>
			void submit('character.vitals.restore', {})
		);
		container.querySelector('[data-action="stats-reset"]').addEventListener('click', () =>
			void submit('character.stats.reset', {}, '确认重置当前角色的全部基础属性？')
		);
		container.querySelector('[data-action="skills-reset"]').addEventListener('click', () =>
			void submit('character.skills.reset', {}, '确认重置当前角色的全部技能？')
		);
		if (pending) container.querySelectorAll('button, input').forEach(element => (element.disabled = true));
	}

	void load();
	return () => {};
}

export default { id: 'character', label: '角色维护', capability: 'characterMaintenanceAllowed', mount };
