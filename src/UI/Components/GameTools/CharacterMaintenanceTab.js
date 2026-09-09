import JobDisplayNameTable, { getJobDisplayName } from 'DB/Jobs/JobDisplayNameTable.js';
import DB from 'DB/DBManager.js';
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
const unsupportedJobIds = new Set([
	13, 21, 22, 26, 27, 28, 29, 30, 4014, 4022, 4036, 4044, 4048, 4080, 4081, 4082, 4083, 4084, 4085, 4086, 4087, 4109,
	4110, 4111, 4112, 4238, 4243, 4244, 4278, 4279, 4280, 4281, 4316
]);
const jobs = Object.keys(JobDisplayNameTable)
	.map(Number)
	.filter(id => !unsupportedJobIds.has(id))
	.sort((a, b) => a - b)
	.map(id => ({ id, name: getJobDisplayName(id, `职业 ${id}`) }));

function changedValues(form, current) {
	return Object.fromEntries(
		new FormData(form)
			.entries()
			.map(([key, value]) => [key, Number(value)])
			.filter(([key, value]) => value !== current[key])
	);
}

function mount(container) {
	container.classList.add('management-tab', 'character-attributes-tab');
	let snapshot;
	let selectedJobId;
	let search = '';
	let pending = false;
	let status = '';
	let statusError = false;

	async function load() {
		container.innerHTML = '<div class="management-loading">正在读取角色实时状态...</div>';
		try {
			snapshot = await loadCurrentCharacter();
			selectedJobId = snapshot.job_id;
			render();
		} catch (error) {
			container.innerHTML = `<div class="management-error">${escapeHtml(error.message)}</div>`;
		}
	}

	async function submitCommands(commands, confirmation) {
		if (pending) return;
		if (confirmation && !(await requestGameToolsConfirmation(container, confirmation))) return;
		if (!commands.length) {
			status = '没有需要应用的修改';
			statusError = false;
			renderDetail();
			return;
		}
		pending = true;
		status = '正在提交...';
		statusError = false;
		renderDetail();
		try {
			for (const { type, payload } of commands) {
				snapshot = await maintainCurrentCharacter(type, payload);
			}
			selectedJobId = snapshot.job_id;
			status = '操作成功，已读取最新状态';
		} catch (error) {
			status = error.message;
			statusError = true;
		} finally {
			pending = false;
			renderJobs();
			renderDetail();
		}
	}

	function submit(type, payload, confirmation) {
		const mayBeEmpty = ![
			'character.progression.update',
			'character.skill_points.update',
			'character.stats.update'
		].includes(type);
		const commands = mayBeEmpty || Object.keys(payload).length ? [{ type, payload }] : [];
		return submitCommands(commands, confirmation);
	}

	function filteredJobs() {
		const term = search.trim().toLocaleLowerCase();
		if (!term) return jobs;
		return jobs.filter(job => job.name.toLocaleLowerCase().includes(term) || String(job.id).includes(term));
	}

	function renderJobs() {
		const filtered = filteredJobs();
		container.querySelector('.character-job-summary').textContent = `共 ${filtered.length} 个职业`;
		container.querySelector('.character-job-list').innerHTML =
			filtered
				.map(
					job => `
			<button class="character-job-row${job.id === selectedJobId ? ' selected' : ''}" type="button" data-job-id="${job.id}">
				<span class="character-job-emblem">${escapeHtml(job.name.slice(0, 1))}</span>
				<span class="monster-row-text"><strong>${escapeHtml(job.name)}</strong><small>ID ${job.id}</small></span>
			</button>`
				)
				.join('') || '<div class="character-job-empty">没有匹配的职业</div>';
		container.querySelectorAll('[data-job-id]').forEach(button => {
			button.addEventListener('click', () => {
				selectedJobId = Number(button.dataset.jobId);
				status = '';
				statusError = false;
				renderJobs();
				renderDetail();
			});
		});
	}

	function renderDetail() {
		const selectedJob = jobs.find(job => job.id === selectedJobId);
		const mapName = DB.getMapInfo(`${snapshot.map}.rsw`)?.displayName || DB.getMapName(snapshot.map, snapshot.map);
		const detail = container.querySelector('.character-detail');
		detail.innerHTML = `
			<header class="character-summary">
				<div><h3>${escapeHtml(snapshot.name)}</h3><p>${escapeHtml(getJobDisplayName(snapshot.job_id, `职业 ${snapshot.job_id}`))} · ${escapeHtml(mapName)} (${snapshot.x}, ${snapshot.y})</p></div>
				<div><strong>HP ${snapshot.hp} / ${snapshot.max_hp}</strong><span>SP ${snapshot.sp} / ${snapshot.max_sp}${snapshot.max_ap ? ` · AP ${snapshot.ap} / ${snapshot.max_ap}` : ''}</span></div>
			</header>
			<div class="character-detail-scroll">
				<section><h4>职业</h4><div class="selected-job"><div><strong>${escapeHtml(selectedJob?.name || `职业 ${selectedJobId}`)}</strong><small>ID ${selectedJobId}</small></div><button data-action="apply-job" type="button" ${pending || selectedJobId === snapshot.job_id ? 'disabled' : ''}>转换职业</button></div></section>
				<section><h4>等级</h4><form data-form="progression" class="management-form level-form">
					<label><span>基础等级</span><input name="base_level" type="number" min="1" max="${snapshot.max_base_level}" value="${snapshot.base_level}" required></label>
					<label><span>职业等级</span><input name="job_level" type="number" min="1" max="${snapshot.max_job_level}" value="${snapshot.job_level}" required></label>
					<label><span>技能点</span><input name="skill_points" type="number" min="0" max="${snapshot.max_skill_points}" value="${snapshot.skill_points}" required></label>
					<button type="submit">应用等级</button>
				</form></section>
				<section><h4>基础属性 <small>剩余 ${snapshot.status_points} 点</small></h4><form data-form="stats" class="management-form stat-form">
					${statFields.map(([key, label]) => `<label><span>${label}</span><input name="${key}" type="number" min="1" max="${snapshot.max_stats?.[key] ?? snapshot.max_stat}" value="${snapshot[key]}" required></label>`).join('')}
					<button type="submit">应用属性</button>
				</form></section>
			</div>
			<footer class="character-actions">
				<button type="button" data-action="vitals">恢复状态</button><button type="button" data-action="stats-reset">重置属性</button><button type="button" data-action="skills-reset">重置技能</button>
				<span class="management-status${statusError ? ' error' : ''}">${escapeHtml(status)}</span>
			</footer>`;

		detail
			.querySelector('[data-action="apply-job"]')
			.addEventListener(
				'click',
				() =>
					void submit(
						'character.progression.update',
						{ job_id: selectedJobId },
						`确认将当前角色转换为“${selectedJob?.name}”？`
					)
			);
		detail.querySelector('[data-form="progression"]').addEventListener('submit', event => {
			event.preventDefault();
			const changes = changedValues(event.currentTarget, snapshot);
			const skillPoints = changes.skill_points;
			delete changes.skill_points;
			const commands = [];
			if (Object.keys(changes).length) commands.push({ type: 'character.progression.update', payload: changes });
			if (skillPoints !== undefined) {
				commands.push({ type: 'character.skill_points.update', payload: { skill_points: skillPoints } });
			}
			void submitCommands(commands);
		});
		detail.querySelector('[data-form="stats"]').addEventListener('submit', event => {
			event.preventDefault();
			void submit('character.stats.update', changedValues(event.currentTarget, snapshot));
		});
		detail
			.querySelector('[data-action="vitals"]')
			.addEventListener('click', () => void submit('character.vitals.restore', {}));
		detail
			.querySelector('[data-action="stats-reset"]')
			.addEventListener(
				'click',
				() => void submit('character.stats.reset', {}, '确认重置当前角色的全部基础属性？')
			);
		detail
			.querySelector('[data-action="skills-reset"]')
			.addEventListener('click', () => void submit('character.skills.reset', {}, '确认重置当前角色的全部技能？'));
		if (pending) detail.querySelectorAll('button, input').forEach(element => (element.disabled = true));
	}

	function render() {
		container.innerHTML = `<div class="character-layout"><section class="character-job-browser">
			<div class="character-job-toolbar"><input type="search" placeholder="搜索职业名称或 ID" aria-label="搜索职业"></div>
			<div class="character-job-summary"></div><div class="character-job-list"></div>
		</section><section class="character-detail"></section></div>`;
		const searchInput = container.querySelector('.character-job-toolbar input');
		searchInput.value = search;
		searchInput.addEventListener('input', () => {
			search = searchInput.value;
			renderJobs();
		});
		renderJobs();
		renderDetail();
	}

	void load();
	return () => {};
}

export default { id: 'character', label: '角色属性', capability: 'characterMaintenanceAllowed', mount };
