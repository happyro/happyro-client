import { resetTabScroll } from './TabViewState.js';
import { clearTabDrafts } from './TabViewState.js';
import { showGameToolsToast, clearGameToolsToast } from './GameToolsToast.js';
import { getJobDisplayName } from 'DB/Jobs/JobDisplayNameTable.js';
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
const traitFields = [['pow', '力量 POW'], ['sta', '耐力 STA'], ['wis', '智慧 WIS'],
	['spl', '法力 SPL'], ['con', '专注 CON'], ['crt', '创造 CRT']];

function jobGroup(job) {
	return job.traits ? (job.id >= 4302 ? '扩展进阶' : '四转') : '基础与进阶';
}

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
	let jobs = [];
	let disposed = false;
	let loadToken = 0;
	let selectedJobId;
	let search = '';
	let group = '';
	let pending = false;
	let status = '';
	let statusError = false;

	async function load() {
		const token = ++loadToken;
		if (!snapshot) container.innerHTML = '<div class="management-loading">正在读取角色实时状态...</div>';
		try {
			const next = await loadCurrentCharacter();
			if (disposed || token !== loadToken) return;
			snapshot = next;
			updateJobs();
			selectedJobId ??= snapshot.job_id;
			if (container.querySelector('.character-detail')) {
				renderJobs();
				renderDetail();
			} else render();
		} catch (error) {
			if (disposed || token !== loadToken) return;
			container.innerHTML = `<div class="management-error">${escapeHtml(error.message)}</div>`;
		}
	}

	async function submitCommands(commands, confirmation) {
		if (pending) return;
		if (confirmation && !(await requestGameToolsConfirmation(container, confirmation))) return;
		if (!commands.length) {
			status = '';
			showGameToolsToast(container, '没有需要应用的修改', 'info');
			statusError = false;
			renderDetail();
			return;
		}
		pending = true;
		status = '';
		showGameToolsToast(container, '正在提交...', 'info');
		statusError = false;
		renderDetail();
		try {
			for (const { type, payload } of commands) {
				snapshot = await maintainCurrentCharacter(type, payload);
				updateJobs();
				clearTabDrafts(container, Object.keys(payload));
			}
			selectedJobId = snapshot.job_id;
			status = '';
			const jobChange = commands.find(
				command => command.type === 'character.progression.update' && command.payload.job_id !== undefined
			);
			showGameToolsToast(
				container,
				jobChange ? `已转职为${getJobDisplayName(snapshot.job_id, '当前职业')}` : '操作成功，已读取最新状态'
			);
		} catch (error) {
			status = error.message;
			clearGameToolsToast(container);
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
			'character.stats.update',
			'character.traits.update'
		].includes(type);
		const commands = mayBeEmpty || Object.keys(payload).length ? [{ type, payload }] : [];
		return submitCommands(commands, confirmation);
	}

	function filteredJobs() {
		const term = search.trim().toLocaleLowerCase();
		return jobs.filter(job => (!group || jobGroup(job) === group)
			&& (!term || job.name.toLocaleLowerCase().includes(term) || String(job.id).includes(term)));
	}

	function updateJobs() {
		jobs = snapshot.jobs.map(job => ({ ...job, name: getJobDisplayName(job.id, `职业 ${job.id}`) }))
			.sort((a, b) => a.id - b.id);
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
				<span class="monster-row-text"><strong>${escapeHtml(job.name)}</strong><small>${jobGroup(job)} · ID ${job.id}</small></span>
			</button>`
				)
				.join('') || '<div class="character-job-empty">没有匹配的职业</div>';
		container.querySelectorAll('[data-job-id]').forEach(button => {
			button.addEventListener('click', () => {
				if (selectedJobId !== Number(button.dataset.jobId)) {
					resetTabScroll(container, container.querySelector('.character-detail'));
				}
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
				<section><h4>职业</h4><div class="selected-job"><div><strong>${escapeHtml(selectedJob?.name || `职业 ${selectedJobId}`)}</strong><small>ID ${selectedJobId}</small></div><button data-action="apply-job" type="button" ${pending || selectedJobId === snapshot.job_id ? 'disabled' : ''}>转换职业</button></div>
				${selectedJob && selectedJobId !== snapshot.job_id ? `<form data-form="job-target" class="management-form level-form"><label><span>转职后的基础等级</span><input name="base_level" type="number" min="1" max="${selectedJob.max_base_level}" value="${snapshot.base_level}" required></label><small>该职业最高 Base ${selectedJob.max_base_level} / Job ${selectedJob.max_job_level}，转职后 Job 从 1 开始。超出上限时请明确调整目标等级。</small></form>` : ''}</section>
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
				${snapshot.traits.enabled ? `<section><h4>四转特性 <small>剩余 ${snapshot.traits.points} / 总计 ${snapshot.traits.budget} 点</small></h4><form data-form="traits" class="management-form stat-form">
					${traitFields.map(([key, label]) => `<label><span>${label}</span><input name="${key}" type="number" min="0" max="${snapshot.traits.maximums[key]}" value="${snapshot.traits.values[key]}" required></label>`).join('')}
					<button type="submit">应用特性</button><button type="button" data-action="traits-reset">重置特性</button>
					<small>每点特性消耗 1 点，合计不能超过当前等级的特性点总额。降低数值会返还点数。</small>
				</form></section>` : ''}
			</div>
			<footer class="character-actions">
				<button type="button" data-action="vitals">恢复状态</button><button type="button" data-action="stats-reset">重置属性</button><button type="button" data-action="skills-reset">重置技能</button>
				<span class="management-status${statusError ? ' error' : status ? ' success' : ''}" role="status" aria-live="polite">${escapeHtml(status)}</span>
			</footer>`;

		detail
			.querySelector('[data-action="apply-job"]')
			.addEventListener(
				'click',
				() => {
					const form = detail.querySelector('[data-form="job-target"]');
					if (!form || !form.reportValidity()) return;
					void submit(
						'character.progression.update',
						{ job_id: selectedJobId, base_level: Number(new FormData(form).get('base_level')) },
						`确认将当前角色转换为“${selectedJob?.name}”？降低基础等级会回收成长点数，点数不足时重置相应属性。`
					);
				}
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
			void submitCommands(commands, changes.base_level < snapshot.base_level
				? '确认降低基础等级？成长点数将被回收，点数不足时重置相应属性。' : undefined);
		});
		detail.querySelector('[data-form="stats"]').addEventListener('submit', event => {
			event.preventDefault();
			void submit('character.stats.update', changedValues(event.currentTarget, snapshot));
		});
		detail.querySelector('[data-form="traits"]')?.addEventListener('submit', event => {
			event.preventDefault();
			void submit('character.traits.update', changedValues(event.currentTarget, snapshot.traits.values));
		});
		detail.querySelector('[data-action="traits-reset"]')?.addEventListener('click', () =>
			void submit('character.traits.reset', {}, '确认重置六项四转特性并返还特性点？基础属性不受影响。'));
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
			<div class="character-job-toolbar"><input type="search" placeholder="搜索职业名称或 ID" aria-label="搜索职业"><select aria-label="职业分组"><option value="">全部职业</option><option>基础与进阶</option><option>四转</option><option>扩展进阶</option></select></div>
			<div class="character-job-summary"></div><div class="character-job-list"></div>
		</section><section class="character-detail"></section></div>`;
		const searchInput = container.querySelector('.character-job-toolbar input');
		const groupInput = container.querySelector('.character-job-toolbar select');
		groupInput.value = group;
		groupInput.addEventListener('change', () => { group = groupInput.value; renderJobs(); });
		searchInput.value = search;
		searchInput.addEventListener('input', () => {
			search = searchInput.value;
			resetTabScroll(container, container.querySelector('.character-job-list'));
			renderJobs();
		});
		renderJobs();
		renderDetail();
	}

	const refresh = () => {
		if (!pending) void load();
	};
	const clearFeedback = () => {
		status = '';
		statusError = false;
		if (snapshot) renderDetail();
	};
	container.addEventListener('game-tools-activate', refresh);
	container.addEventListener('game-tools-reset-feedback', clearFeedback);
	void load();
	return () => {
		disposed = true;
		loadToken++;
		container.removeEventListener('game-tools-activate', refresh);
		container.removeEventListener('game-tools-reset-feedback', clearFeedback);
	};
}

export default {
	id: 'character',
	label: '角色属性',
	refreshOnOpen: true,
	capability: 'characterMaintenanceAllowed',
	mount
};
