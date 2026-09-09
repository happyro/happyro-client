import { applyAdventureGameRules, loadAdventureGameRules } from './AdventureControlService.js';
import escapeHtml from './escapeHtml.js';
import { requestGameToolsConfirmation } from './GameToolsConfirm.js';
import { mountGameSelects, renderGameSelect } from './GameSelect.js';

const groups = [
	{
		title: '经验倍率',
		keys: ['base_exp_rate', 'job_exp_rate']
	},
	{
		title: '地图导航',
		keys: [
			'navigation_teleport_policy',
			'navigation_teleport_cross_map',
			'navigation_teleport_cooldown',
			'navigation_map_channels_enabled'
		]
	},
	{
		title: '魔物召唤',
		keys: [
			'game_tools_monster_spawn_policy',
			'game_tools_monster_spawn_cooldown',
			'game_tools_monster_spawn_duration',
			'game_tools_monster_spawn_allow_boss'
		]
	}
];
const normalDropKeys = ['item_rate_common', 'item_rate_heal', 'item_rate_use', 'item_rate_equip', 'item_rate_card'];
const mvpDropKeys = [
	'item_rate_common_mvp',
	'item_rate_heal_mvp',
	'item_rate_use_mvp',
	'item_rate_equip_mvp',
	'item_rate_card_mvp'
];
const labels = {
	base_exp_rate: '基础经验倍率',
	job_exp_rate: '职业经验倍率',
	item_rate_common: '普通物品掉落倍率',
	item_rate_common_boss: 'Boss 普通物品掉落倍率',
	item_rate_common_mvp: 'MVP 普通物品掉落倍率',
	item_rate_heal: '恢复品掉落倍率',
	item_rate_heal_mvp: 'MVP 恢复品掉落倍率',
	item_rate_use: '消耗品掉落倍率',
	item_rate_use_mvp: 'MVP 消耗品掉落倍率',
	item_rate_equip: '装备与武器掉落倍率',
	item_rate_equip_mvp: 'MVP 装备与武器掉落倍率',
	item_rate_card: '卡片掉落倍率',
	item_rate_card_boss: 'Boss 卡片掉落倍率',
	item_rate_card_mvp: 'MVP 卡片掉落倍率',
	navigation_teleport_policy: '地图传送开放范围',
	navigation_teleport_cross_map: '允许跨地图传送',
	navigation_teleport_cooldown: '传送冷却',
	navigation_map_channels_enabled: '启用地图分流',
	game_tools_monster_spawn_policy: '魔物召唤开放范围',
	game_tools_monster_spawn_cooldown: '召唤冷却',
	game_tools_monster_spawn_duration: '魔物存在时间',
	game_tools_monster_spawn_allow_boss: '允许召唤 Boss / MVP'
};
const rateKeys = new Set([...groups[0].keys, ...normalDropKeys, ...mvpDropKeys]);
const visibleKeys = new Set([...groups.flatMap(group => group.keys), ...normalDropKeys, ...mvpDropKeys]);

function displayValue(key, value) {
	return rateKeys.has(key) ? Number(value) / 100 : value;
}

function serverValue(key, value) {
	return rateKeys.has(key) ? Math.round(Number(value) * 100) : Number(value);
}

function control(key, value, definition) {
	if (definition.unit === 'boolean') {
		return renderGameSelect({
			name: key,
			ariaLabel: labels[key],
			value,
			options: [
				{ value: 1, label: '开启' },
				{ value: 0, label: '关闭' }
			]
		});
	}
	if (definition.unit === 'policy') {
		return renderGameSelect({
			name: key,
			ariaLabel: labels[key],
			value,
			options: [
				...(definition.minimum === 0 ? [{ value: 0, label: '关闭' }] : []),
				{ value: 1, label: '仅管理员' },
				{ value: 2, label: '所有玩家' }
			]
		});
	}
	const isRate = rateKeys.has(key);
	const suffix = definition.unit === 'seconds' ? ' 秒' : ' 倍';
	return `<span class="setting-number"><input name="${key}" type="number" min="${displayValue(key, definition.minimum)}" max="${displayValue(key, definition.maximum)}" step="${isRate ? '0.01' : '1'}" value="${displayValue(key, value)}" required><em>${suffix}</em></span>`;
}

function mount(container) {
	container.classList.add('management-tab');
	let settings;

	async function load(message = '') {
		container.innerHTML = '<div class="management-loading">正在读取服务器实际设置...</div>';
		try {
			settings = await loadAdventureGameRules();
			render(message);
		} catch (error) {
			container.innerHTML = `<div class="management-error">${escapeHtml(error.message)}</div>`;
		}
	}

	function render(message = '', error = false) {
		container.innerHTML = `<form class="settings-form">
			<div class="settings-scroll">
				<section><h4>经验倍率</h4><div class="settings-grid">${groups[0].keys.map(key => `<label><span>${labels[key]}</span>${control(key, settings.values[key], settings.definitions[key])}</label>`).join('')}</div></section>
				<section><h4>掉落倍率（普通魔物 &amp; MVP）</h4><div class="settings-rate-columns">
					<div class="settings-rate-list">${normalDropKeys.map(key => `<label><span>${labels[key]}</span>${control(key, settings.values[key], settings.definitions[key])}</label>`).join('')}</div>
					<div class="settings-rate-list">${mvpDropKeys.map(key => `<label><span>${labels[key]}</span>${control(key, settings.values[key], settings.definitions[key])}</label>`).join('')}</div>
				</div></section>
				${groups
					.slice(1)
					.map(
						group =>
							`<section><h4>${group.title}</h4><div class="settings-grid">${group.keys.map(key => `<label><span>${labels[key]}</span>${control(key, settings.values[key], settings.definitions[key])}</label>`).join('')}</div></section>`
					)
					.join('')}
			</div>
			<footer class="settings-footer">
				<span class="management-status${error ? ' error' : ''}">${escapeHtml(message)}</span>
				<button type="submit">应用全服设置</button>
			</footer>
		</form>`;
		mountGameSelects(container);
		container.querySelector('form').addEventListener('submit', async event => {
			event.preventDefault();
			const form = event.currentTarget;
			const data = new FormData(form);
			const changes = {};
			for (const key of visibleKeys) {
				const value = serverValue(key, data.get(key));
				if (value !== settings.values[key]) changes[key] = value;
			}
			if (!Object.keys(changes).length) {
				render('没有需要应用的修改');
				return;
			}
			form.querySelectorAll('button, input').forEach(element => (element.disabled = true));
			if (
				!(await requestGameToolsConfirmation(
					container,
					`确认将 ${Object.keys(changes).length} 项修改应用到全服？`
				))
			) {
				form.querySelectorAll('button, input').forEach(element => (element.disabled = false));
				return;
			}
			try {
				const result = await applyAdventureGameRules(changes);
				settings.values = result.values;
				render('设置已应用并回读成功');
			} catch (requestError) {
				render(requestError.message, true);
			}
		});
	}

	void load();
	return () => {};
}

export default { id: 'settings', label: '游戏设置', capability: 'gameSettingsAllowed', mount };
