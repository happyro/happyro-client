import DB from 'DB/DBManager.js';
import Session from 'Engine/SessionStorage.js';
import { mountCatalogBrowser } from './CatalogBrowser.js';
import { escapeCatalogHtml, matchesCatalogSearch } from './CatalogData.js';
import {
	getAdventureActionState,
	getCurrentAdventureMap,
	subscribeAdventureActions,
	teleportToNpc
} from './AdventureActionService.js';
import { requestNpcAvailability } from './NpcAvailabilityService.js';
import { loadNpcAssets, npcAtlasStyle } from './WorldAssetService.js';
import { loadCatalogMap } from './WorldAssetService.js';
import { drawWorldMapPreview } from './WorldMapPreview.js';
import { mergeNpcCatalog, npcCatalogKey, npcTeleportEnabled } from './WorldCatalogService.js';
import { renderGameSelect } from './GameSelect.js';

const key = npcCatalogKey;
const catalogPromises = new Map();

export function loadAdventureNpcCatalog() {
	const catalogKey = Session.NavigationMapChannelsEnabled ? 'channels' : 'shared';
	if (!catalogPromises.has(catalogKey)) {
		catalogPromises.set(
			catalogKey,
			Promise.all([
				loadNpcAssets(),
				Promise.resolve(DB.listNavigation('NPC', { channelsEnabled: Session.NavigationMapChannelsEnabled }))
			]).then(([assets, npcs]) => {
				const mapNames = new Map();
				const localizeMap = mapName => {
					if (!mapNames.has(mapName))
						mapNames.set(
							mapName,
							DB.getMapInfo(`${mapName}.rsw`)?.displayName || DB.getMapName(mapName, mapName)
						);
					return mapNames.get(mapName);
				};
				return { assets, items: mergeNpcCatalog(npcs, localizeMap) };
			})
		);
	}
	return catalogPromises.get(catalogKey);
}

function filterNpcs(npcs, search, scope) {
	const currentMap = getCurrentAdventureMap();
	const filtered = npcs.filter(
		npc =>
			(scope !== 'current' || npc.mapName === currentMap) &&
			matchesCatalogSearch(
				[npc.name, npc.sourceName, npc.rawName, npc.aliases, npc.mapDisplayName, npc.mapName, npc.npcClass],
				search
			)
	);
	const term = String(search || '')
		.trim()
		.toLocaleLowerCase();
	if (!term && scope === 'all') return filtered;
	const rank = npc => {
		const names = [npc.name, npc.sourceName, npc.rawName, npc.aliases]
			.flat()
			.map(value => String(value || '').toLocaleLowerCase());
		if (names.some(name => name === term)) return 0;
		if (names.some(name => name.startsWith(term))) return 1;
		if (names.some(name => name.includes(term))) return 2;
		return 3;
	};
	return filtered.sort(
		(left, right) =>
			Number(right.mapName === currentMap) - Number(left.mapName === currentMap) ||
			rank(left) - rank(right) ||
			Number(right.source === 'server+navigation') - Number(left.source === 'server+navigation') ||
			left.name.localeCompare(right.name) ||
			left.mapDisplayName.localeCompare(right.mapDisplayName)
	);
}

function mount(container) {
	container.classList.add('world-catalog-tab', 'npc-catalog-tab');
	let manifest = null;
	let available = null;
	let checking = false;
	let actionState = {};
	let selectionToken = 0;
	let loadedNpcMap = null;
	let loadingNpcMapName = '';
	let mapLoadToken = 0;
	const browser = mountCatalogBrowser(container, {
		placeholder: '搜索 NPC、地图或编号',
		searchLabel: '搜索 NPC',
		filterHtml: renderGameSelect({
			className: 'catalog-filter',
			ariaLabel: 'NPC 范围',
			value: 'all',
			options: [
				{ value: 'all', label: '全世界' },
				{ value: 'current', label: '当前地图' }
			]
		}),
		emptyDetail: '选择一个 NPC 查看详情',
		pageSize: 32,
		key,
		filter: filterNpcs,
		renderRow(npc, selected) {
			const style = npcAtlasStyle(manifest, npc.spriteId, 48);
			return `<button class="catalog-row${key(selected || {}) === key(npc) ? ' selected' : ''}" type="button" data-catalog-key="${escapeCatalogHtml(key(npc))}">
				<span class="catalog-thumb${style ? '' : ' no-image'}" style="${style}"></span>
				<span class="catalog-row-text"><strong>${escapeCatalogHtml(npc.name)}</strong><small>${escapeCatalogHtml(npc.mapDisplayName)} · ${npc.x},${npc.y}</small></span>
			</button>`;
		},
		renderDetail(detail, npc, api) {
			if (loadingNpcMapName !== npc.mapName) {
				loadingNpcMapName = npc.mapName;
				loadedNpcMap = null;
				const token = ++mapLoadToken;
				loadCatalogMap(npc.mapName).then(resource => {
					if (token !== mapLoadToken) return;
					loadedNpcMap = resource;
					api.refreshDetail();
				});
			}
			const style = npcAtlasStyle(manifest, npc.spriteId, 112);
			const canTeleport = npcTeleportEnabled(npc, available, { ...actionState, ...getAdventureActionState(npc) });
			detail.innerHTML = `<div class="catalog-heading">
				<span class="catalog-portrait${style ? '' : ' no-image'}" style="${style}"></span>
				<div><h3>${escapeCatalogHtml(npc.name)}</h3><p>${escapeCatalogHtml(npc.sourceName)} · ${npc.npcClass}</p></div>
			</div>
			<div class="catalog-metadata"><div><span>地图</span><strong>${escapeCatalogHtml(npc.mapDisplayName)}</strong></div><div><span>地图代码</span><strong>${escapeCatalogHtml(npc.mapName)}</strong></div><div><span>坐标</span><strong>${npc.x}, ${npc.y}</strong></div><div><span>在线状态</span><strong>${checking ? '校验中...' : available ? '可用' : available === false ? '不可用' : '待校验'}</strong></div></div>
			<div class="npc-location-preview"><canvas class="npc-map-canvas" width="480" height="240" aria-label="${escapeCatalogHtml(npc.mapDisplayName)}中的 NPC 位置"></canvas></div>
			<div class="catalog-action-panel">
				<button class="catalog-teleport" type="button" ${canTeleport ? '' : 'disabled'}>${actionState.npcPending ? '正在传送...' : '传送到 NPC 附近'}</button>
				<span class="catalog-status${actionState.kind === 'npc' && actionState.error ? ' error' : ''}">${escapeCatalogHtml((actionState.kind === 'npc' ? actionState.message : '') || (!Session.NavigationTeleportAllowed ? '当前账号没有传送权限' : ''))}</span>
			</div>`;
			drawWorldMapPreview(detail.querySelector('.npc-map-canvas'), loadedNpcMap?.image, npc, loadedNpcMap?.gat);
			detail.querySelector('.catalog-teleport').addEventListener('click', () => teleportToNpc(npc));

			const token = selectionToken;
			if (available === null && !checking) {
				checking = true;
				requestNpcAvailability([npc])
					.then(result => {
						if (token !== selectionToken) return;
						available = result[0];
						checking = false;
						api.refreshDetail();
					})
					.catch(() => {
						if (token !== selectionToken) return;
						available = false;
						checking = false;
						api.refreshDetail();
					});
			}
		}
	});

	const originalRenderDetail = browser.refreshDetail;
	const resetSelectionAvailability = () => {
		selectionToken += 1;
		available = null;
		checking = false;
	};
	container.querySelector('.catalog-list').addEventListener('click', resetSelectionAvailability, true);
	const unsubscribeActions = subscribeAdventureActions(state => {
		actionState = state;
		originalRenderDetail();
	});

	loadAdventureNpcCatalog()
		.then(({ assets, items }) => {
			manifest = assets;
			browser.setItems(items);
		})
		.catch(error => {
			console.error(error);
			browser.setStatus('NPC 资料加载失败');
		});

	return () => {
		selectionToken += 1;
		mapLoadToken += 1;
		unsubscribeActions();
	};
}

export default { id: 'npcs', label: 'NPC 图鉴', mount };
