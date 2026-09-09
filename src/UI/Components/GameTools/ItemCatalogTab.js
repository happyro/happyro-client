import { grantAdventureItem, loadAdventureAsset, searchAdventureItems } from './AdventureControlService.js';
import { escapeCatalogHtml } from './CatalogData.js';
import { requestGameToolsConfirmation } from './GameToolsConfirm.js';
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
const errorMessages = {
	inventory_full: '背包空间不足',
	inventory_overweight: '背包负重不足',
	item_amount_exceeded: '数量超过堆叠上限',
	item_not_found: '物品不存在或当前服务端不可用',
	item_not_grantable: '该特殊物品暂不支持直接发放',
	character_offline: '当前角色不在线'
};
function loadImage(element, path, assetUrls) {
	if (!path) return;
	const cached = assetUrls.get(path);
	if (cached) {
		element.src = cached;
		return;
	}
	loadAdventureAsset(path.replace('/api/adventure-tools', ''))
		.then(url => {
			assetUrls.set(path, url);
			if (element.isConnected) element.src = url;
		})
		.catch(() => element.classList.add('no-image'));
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
		filterHtml: `<select class="catalog-filter" aria-label="物品类型"><option value="">全部类型</option>${Object.entries(
			typeNames
		)
			.map(([value, label]) => `<option value="${value}">${label}</option>`)
			.join('')}</select>`,
		emptyDetail: '选择一个物品查看详情',
		pageSize: 30,
		key: item => item.Id,
		async load(query) {
			const result = await searchAdventureItems({ ...query, type: query.filter });
			return { items: result.data, total: result.total };
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
			detail.innerHTML = `<div class="catalog-heading item-heading"><span class="catalog-portrait item-portrait"><img alt="${escapeCatalogHtml(name)}"></span><div><h3>${escapeCatalogHtml(name)}</h3><p>${escapeCatalogHtml(item.AegisName)} · ID ${item.Id}</p></div></div>
			<div class="catalog-metadata"><div><span>类型</span><strong>${escapeCatalogHtml(typeNames[item.Type] || item.Type || '其他')}</strong></div><div><span>重量</span><strong>${Number(item.Weight || 0) / 10}</strong></div><div><span>购买价</span><strong>${item.Buy ?? '-'}</strong></div><div><span>出售价格</span><strong>${item.Sell ?? '-'}</strong></div></div>
			<div class="item-description">${renderDescription(item.description)}</div>
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
