import { applyAdventureGameRules, loadAdventureGameRules } from './AdventureControlService.js';
import escapeHtml from './escapeHtml.js';
import { requestGameToolsConfirmation } from './GameToolsConfirm.js';

const groups = [
	{
		title: '经验与掉落倍率',
		keys: ['base_exp_rate', 'job_exp_rate', 'item_rate_common', 'item_rate_common_boss', 'item_rate_common_mvp', 'item_rate_card', 'item_rate_card_boss', 'item_rate_card_mvp']
	},
	{
		title: '地图导航',
		keys: ['navigation_teleport_policy', 'navigation_teleport_cross_map', 'navigation_teleport_cooldown', 'navigation_map_channels_enabled']
	},
	{
		title: '魔物召唤',
		keys: ['game_tools_monster_spawn_policy', 'game_tools_monster_spawn_cooldown', 'game_tools_monster_spawn_duration', 'game_tools_monster_spawn_allow_boss']
	}
];
const labels = {
	base_exp_rate: '基础经验倍率', job_exp_rate: '职业经验倍率', item_rate_common: '普通物品掉落倍率',
	item_rate_common_boss: 'Boss 普通物品掉落倍率', item_rate_common_mvp: 'MVP 普通物品掉落倍率',
	item_rate_card: '卡片掉落倍率', item_rate_card_boss: 'Boss 卡片掉落倍率', item_rate_card_mvp: 'MVP 卡片掉落倍率',
	navigation_teleport_policy: '地图传送开放范围', navigation_teleport_cross_map: '允许跨地图传送',
	navigation_teleport_cooldown: '传送冷却', navigation_map_channels_enabled: '启用地图分流',
	game_tools_monster_spawn_policy: '魔物召唤开放范围', game_tools_monster_spawn_cooldown: '召唤冷却',
	game_tools_monster_spawn_duration: '魔物存在时间', game_tools_monster_spawn_allow_boss: '允许召唤 Boss / MVP'
};

function control(key, value, definition) {
	if (definition.unit === 'boolean') {
		return `<select name="${key}"><option value="1"${value === 1 ? ' selected' : ''}>开启</option><option value="0"${value === 0 ? ' selected' : ''}>关闭</option></select>`;
	}
	if (definition.unit === 'policy') {
		const disabled = definition.minimum === 0 ? `<option value="0"${value === 0 ? ' selected' : ''}>关闭</option>` : '';
		return `<select name="${key}">${disabled}<option value="1"${value === 1 ? ' selected' : ''}>仅管理员</option><option value="2"${value === 2 ? ' selected' : ''}>所有玩家</option></select>`;
	}
	const suffix = definition.unit === 'seconds' ? ' 秒' : '%';
	return `<span class="setting-number"><input name="${key}" type="number" min="${definition.minimum}" max="${definition.maximum}" value="${value}" required><em>${suffix}</em></span>`;
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
				${groups.map(group => `<section><h4>${group.title}</h4><div class="settings-grid">${group.keys.map(key => `<label><span>${labels[key]}</span>${control(key, settings.values[key], settings.definitions[key])}</label>`).join('')}</div></section>`).join('')}
			</div>
			<footer class="settings-footer">
				<label><span>修改原因</span><input name="reason" maxlength="255" placeholder="必填，将记录在配置历史中" required></label>
				<span class="management-status${error ? ' error' : ''}">${escapeHtml(message)}</span>
				<button type="submit">应用全服设置</button>
			</footer>
		</form>`;
		container.querySelector('form').addEventListener('submit', async event => {
			event.preventDefault();
			const form = event.currentTarget;
			const data = new FormData(form);
			const changes = {};
			for (const key of Object.keys(settings.definitions)) {
				const value = Number(data.get(key));
				if (value !== settings.values[key]) changes[key] = value;
			}
			if (!Object.keys(changes).length) {
				render('没有需要应用的修改');
				return;
			}
			form.querySelectorAll('button, input, select').forEach(element => (element.disabled = true));
			if (!(await requestGameToolsConfirmation(container, `确认将 ${Object.keys(changes).length} 项修改应用到全服？`))) {
				form.querySelectorAll('button, input, select').forEach(element => (element.disabled = false));
				return;
			}
			try {
				const result = await applyAdventureGameRules(changes, String(data.get('reason')));
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
