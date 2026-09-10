import {
	grantAdventureItem,
	grantAdventureZeny,
	loadAdventureAsset,
	searchAdventureItems
} from './AdventureControlService.js';
import { escapeCatalogHtml } from './CatalogData.js';
import { requestGameToolsConfirmation } from './GameToolsConfirm.js';
import { requestGameToolsNumber } from './GameToolsNumberPrompt.js';
import { renderGameSelect } from './GameSelect.js';
import { mountRemoteCatalogBrowser } from './RemoteCatalogBrowser.js';

const typeNames = {
	Healing: '恢复品',
	Usable: '消耗品',
	Etc: '其他',
	Weapon: '武器',
	Armor: '防具',
	Card: '卡片',
	PetEgg: '宠物蛋',
	PetArmor: '宠物装备',
	Ammo: '弹药',
	Cash: '商城物品'
};
const weaponSubtypeNames = {
	Dagger: '短剑',
	'1hSword': '单手剑',
	'2hSword': '双手剑',
	'1hSpear': '单手矛',
	'2hSpear': '双手矛',
	'1hAxe': '单手斧',
	'2hAxe': '双手斧',
	Mace: '钝器',
	Staff: '单手杖',
	'2hStaff': '双手杖',
	Bow: '弓',
	Katar: '拳刃',
	Book: '书',
	Knuckle: '拳套',
	Musical: '乐器',
	Whip: '鞭子',
	Huuma: '风魔飞镖',
	Revolver: '左轮手枪',
	Rifle: '步枪',
	Gatling: '加特林机枪',
	Shotgun: '霰弹枪',
	Grenade: '榴弹发射器'
};
const errorMessages = {
	inventory_full: '背包空间不足',
	inventory_overweight: '背包负重不足',
	item_amount_exceeded: '数量超过堆叠上限',
	item_not_found: '物品不存在或当前服务端不可用',
	item_not_grantable: '该特殊物品暂不支持直接发放',
	character_offline: '当前角色不在线'
};
function loadImage(element, path, assetUrls) {
	const frame = element.parentElement;
	if (!path) {
		frame?.classList.add('no-image');
		return;
	}
	const cached = assetUrls.get(path);
	if (cached) {
		frame?.classList.remove('no-image');
		element.src = cached;
		return;
	}
	loadAdventureAsset(path.replace('/api/adventure-tools', ''))
		.then(url => {
			assetUrls.set(path, url);
			if (element.isConnected) {
				frame?.classList.remove('no-image');
				element.src = url;
			}
		})
		.catch(() => frame?.classList.add('no-image'));
}

function renderDescription(value) {
	const lines = Array.isArray(value) ? value : [value];
	return (
		lines
			.filter(Boolean)
			.map(line => `<p>${escapeCatalogHtml(line)}</p>`)
			.join('') || '<p>暂无说明</p>'
	);
}

function mount(container, context = {}) {
	container.classList.add('world-catalog-tab', 'item-catalog-tab');
	const assetUrls = new Map();
	let pending = false;
	let status = '';
	let statusError = false;
	return mountRemoteCatalogBrowser(container, {
		placeholder: '搜索中文名、英文名、Aegis 名或 ID',
		searchLabel: '搜索物品',
		filterHtml:
			renderGameSelect({
				name: 'type',
				className: 'catalog-filter',
				ariaLabel: '物品类型',
				value: '',
				options: [
					{ value: '', label: '全部类型' },
					...Object.entries(typeNames).map(([value, label]) => ({ value, label }))
				]
			}) +
			renderGameSelect({
				name: 'subtype',
				className: 'catalog-filter weapon-subtype-filter',
				ariaLabel: '武器类型',
				value: '',
				options: [
					{ value: '', label: '武器类型' },
					...Object.entries(weaponSubtypeNames).map(([value, label]) => ({ value, label }))
				]
			}),
		toolbarActionHtml: `<button class="zeny-grant-open" type="button" ${context.capabilities?.itemGrantAllowed ? '' : 'disabled'}>发放 Zeny</button>`,
		emptyDetail: '选择一个物品查看详情',
		pageSize: 30,
		key: item => item.Id,
		async load(query) {
			const result = await searchAdventureItems({
				...query,
				type: query.filters.type,
				subtype: query.filters.subtype
			});
			return { items: result.data, total: result.total };
		},
		onFiltersChange(filters) {
			const root = container.querySelector('.weapon-subtype-filter[data-game-select]');
			const input = root.querySelector('.game-select-value');
			const disabled = filters.type !== 'Weapon';
			root.querySelector('.game-select-trigger').disabled = disabled;
			if (disabled && input.value) {
				input.value = '';
				root.querySelector('.game-select-trigger span').textContent = '武器类型';
			}
		},
		onReady({ container: root, refreshDetail }) {
			const button = root.querySelector('.zeny-grant-open');
			button.addEventListener('click', async () => {
				const amount = await requestGameToolsNumber(root, {
					title: '向当前角色发放 Zeny',
					label: '数量',
					value: 100000,
					min: 1,
					max: 2147483647
				});
				if (amount === null) return;
				button.disabled = true;
				try {
					await grantAdventureZeny(amount);
					status = `已发放 ${amount.toLocaleString()} Zeny`;
					statusError = false;
					button.textContent = '发放成功';
				} catch (error) {
					status = error.code === 'zeny_amount_exceeded' ? '发放后会超过角色 Zeny 持有上限' : error.message;
					statusError = true;
					button.textContent = '发放失败';
				}
				refreshDetail();
				setTimeout(() => {
					if (!button.isConnected) return;
					button.textContent = '发放 Zeny';
					button.disabled = false;
				}, 1500);
			});
		},
		renderRow(item, selected) {
			return `<button class="catalog-row${selected?.Id === item.Id ? ' selected' : ''}" type="button" data-catalog-key="${item.Id}">
				<span class="catalog-thumb item-thumb"><img data-item-icon="${item.Id}" alt=""></span>
				<span class="catalog-row-text"><strong>${escapeCatalogHtml(item.names?.['zh-CN'] || item.AegisName)}</strong><small>${escapeCatalogHtml(typeNames[item.Type] || item.Type || '其他')} · ID ${item.Id}</small></span>
			</button>`;
		},
		onListRendered(list, items) {
			list.querySelectorAll('[data-item-icon]').forEach(image => {
				const item = items.find(candidate => candidate.Id === Number(image.dataset.itemIcon));
				loadImage(image, item?.icon, assetUrls);
			});
		},
		renderDetail(detail, item, api) {
			const name = item.names?.['zh-CN'] || item.names?.['en-US'] || item.AegisName;
			const canGrant = context.capabilities?.itemGrantAllowed && item.grantable;
			detail.innerHTML = `<div class="item-detail-content"><div class="catalog-heading item-heading"><span class="catalog-portrait item-portrait"><img alt="${escapeCatalogHtml(name)}"></span><div><h3>${escapeCatalogHtml(name)}</h3><p>${escapeCatalogHtml(item.AegisName)} · ID ${item.Id}</p></div></div>
			<div class="catalog-metadata"><div><span>类型</span><strong>${escapeCatalogHtml(typeNames[item.Type] || item.Type || '其他')}</strong></div><div><span>重量</span><strong>${Number(item.Weight || 0) / 10}</strong></div><div><span>购买价</span><strong>${item.Buy ?? '-'}</strong></div><div><span>出售价格</span><strong>${item.Sell ?? '-'}</strong></div></div>
			<div class="item-description">${renderDescription(item.description)}</div></div>
			<div class="catalog-action-panel item-grant-panel"><label>数量 <input class="item-grant-amount" type="number" min="1" max="30000" value="1"></label><button class="item-grant" type="button" ${pending || !canGrant ? 'disabled' : ''}>${pending ? '发放中...' : '发放到背包'}</button><span class="catalog-status${statusError ? ' error' : ''}">${escapeCatalogHtml(status || (!item.grantable ? '该特殊物品暂不支持直接发放' : !context.capabilities?.itemGrantAllowed ? '当前账号没有发放权限' : '仅发放给当前角色'))}</span></div>`;
			loadImage(detail.querySelector('.item-portrait img'), item.illustration || item.icon, assetUrls);
			detail.querySelector('.item-grant').addEventListener('click', async () => {
				const amount = Number(detail.querySelector('.item-grant-amount').value);
				if (!Number.isInteger(amount) || amount < 1 || amount > 30000) {
					status = '请输入 1 至 30000 的整数';
					statusError = true;
					api.refreshDetail();
					return;
				}
				if (
					!(await requestGameToolsConfirmation(container, `确认向当前角色发放 ${amount} 个“${name}”到背包？`))
				)
					return;
				pending = true;
				status = '';
				statusError = false;
				api.refreshDetail();
				try {
					await grantAdventureItem(item.Id, amount);
					status = `已发放 ${amount} 个到当前角色背包`;
				} catch (error) {
					status = errorMessages[error.code] || error.message;
					statusError = true;
				} finally {
					pending = false;
					api.refreshDetail();
				}
			});
		},
		cleanup() {
			assetUrls.forEach(url => URL.revokeObjectURL(url));
			assetUrls.clear();
		}
	});
}

export default { id: 'items', label: '物品图鉴', mount };
