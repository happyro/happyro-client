import DB from 'DB/DBManager.js';
import { getMapChannel } from 'DB/Map/MapChannels.js';
import MiniMapTable from 'DB/Map/MiniMapTable.js';
import Session from 'Engine/SessionStorage.js';
import { mountCatalogBrowser } from './CatalogBrowser.js';
import { escapeCatalogHtml } from './CatalogData.js';
import {
	getAdventureActionState,
	getCurrentAdventureMap,
	getCurrentAdventurePosition,
	normalizeAdventureMap,
	subscribeAdventureActions,
	teleportToCoordinate,
	teleportToNpc
} from './AdventureActionService.js';
import { requestNpcAvailability } from './NpcAvailabilityService.js';
import { loadAdventureNpcCatalog } from './NpcCatalogTab.js';
import {
	previewAdventureRoute,
	startAdventureRoute,
	stopAdventureRoute,
	subscribeAdventureRoute
} from './AdventureRouteService.js';
import { filterAndSortMaps } from './MapCatalogData.js';
import { renderGameSelect } from './GameSelect.js';
import {
	canvasToMapCoordinate,
	findDefaultMapCoordinate,
	findNearestWalkableCoordinate,
	loadCatalogMap,
	loadCatalogMapImage,
	loadNpcAssets
} from './WorldAssetService.js';
import { drawWorldMapPreview } from './WorldMapPreview.js';
import { filterNpcsOnMap, npcCatalogKey, npcTeleportEnabled, toWorldEntities } from './WorldCatalogService.js';

function filterMaps(maps, search, scope) {
	return filterAndSortMaps(maps, search, scope, getCurrentAdventureMap());
}

function npcAvailabilityLabel(available) {
	if (available === true) return '可传送';
	if (available === false) return '不可用';
	if (available === 'checking') return '校验中...';
	return '待校验';
}

function mount(container) {
	container.classList.add('world-catalog-tab', 'map-catalog-tab');
	let actionState = {};
	let routeState = {};
	let selectedCoordinate = null;
	let loadedMap = null;
	let loadingMapName = '';
	let loadToken = 0;
	let thumbnailToken = 0;
	let thumbnailObserver = null;
	let redrawPreview = () => {};
	let catalogNpcs = [];
	let npcAvailability = {};
	let npcAvailabilityToken = 0;
	let selectedNpcKey = '';
	const browser = mountCatalogBrowser(container, {
		placeholder: '搜索地图名称或代码',
		searchLabel: '搜索地图',
		filterHtml: renderGameSelect({
			className: 'catalog-filter',
			ariaLabel: '地图范围',
			value: 'all',
			options: [
				{ value: 'all', label: '全部地图' },
				{ value: 'current', label: '当前地图' }
			]
		}),
		emptyDetail: '选择一个地图查看详情',
		pageSize: 35,
		key: map => map.id,
		filter: filterMaps,
		renderRow(map, selected) {
			return `<button class="catalog-row map-row${selected?.id === map.id ? ' selected' : ''}" type="button" data-catalog-key="${escapeCatalogHtml(map.id)}">
				<span class="map-thumb" data-map-thumb="${escapeCatalogHtml(map.id)}"><span>无图</span></span><span class="catalog-row-text"><strong>${escapeCatalogHtml(map.name)}</strong><small>${escapeCatalogHtml(map.id)}</small></span>
			</button>`;
		},
		onListRendered(list, maps) {
			const token = ++thumbnailToken;
			thumbnailObserver?.disconnect();
			const mapsById = new Map(maps.map(map => [map.id, map]));
			const renderThumbnail = async thumbnail => {
				const map = mapsById.get(thumbnail.dataset.mapThumb);
				if (!map) return;
				const image = await loadCatalogMapImage(map.mapName);
				if (token !== thumbnailToken || !thumbnail.isConnected) return;
				if (image) {
					const preview = document.createElement('img');
					preview.src = image;
					preview.alt = '';
					thumbnail.replaceChildren(preview);
					return;
				}
				const resource = await loadCatalogMap(map.mapName);
				if (token !== thumbnailToken || !thumbnail.isConnected || !resource?.gat?.cells) return;
				const preview = document.createElement('canvas');
				preview.width = 112;
				preview.height = 84;
				preview.setAttribute('aria-hidden', 'true');
				drawWorldMapPreview(preview, null, null, resource.gat);
				thumbnail.replaceChildren(preview);
			};
			thumbnailObserver =
				typeof IntersectionObserver === 'function'
					? new IntersectionObserver(
							entries => {
								for (const entry of entries) {
									if (!entry.isIntersecting) continue;
									thumbnailObserver?.unobserve(entry.target);
									renderThumbnail(entry.target);
								}
							},
							{ root: list, rootMargin: '80px' }
						)
					: null;
			for (const thumbnail of list.querySelectorAll('[data-map-thumb]')) {
				if (thumbnailObserver) thumbnailObserver.observe(thumbnail);
				else renderThumbnail(thumbnail);
			}
		},
		renderDetail(detail, map, api) {
			if (loadingMapName !== map.mapName) {
				loadingMapName = map.mapName;
				selectedCoordinate = { x: 0, y: 0, random: true };
				loadedMap = null;
				selectedNpcKey = '';
				npcAvailability = {};
				const token = ++loadToken;
				loadCatalogMap(map.mapName).then(resource => {
					if (token !== loadToken) return;
					loadedMap = resource;
					selectedCoordinate = findDefaultMapCoordinate(resource?.gat) || selectedCoordinate;
					api.refreshDetail();
				});
				const mapNpcsForCheck = filterNpcsOnMap(catalogNpcs, map.mapName);
				if (mapNpcsForCheck.length) {
					const availabilityToken = ++npcAvailabilityToken;
					for (const npc of mapNpcsForCheck) npcAvailability[npcCatalogKey(npc)] = 'checking';
					const batches = [];
					for (let index = 0; index < mapNpcsForCheck.length; index += 50) {
						batches.push(mapNpcsForCheck.slice(index, index + 50));
					}
					Promise.all(batches.map(batch => requestNpcAvailability(batch)))
						.then(results => {
							if (availabilityToken !== npcAvailabilityToken) return;
							const next = {};
							let offset = 0;
							for (const result of results) {
								for (const available of result) {
									next[npcCatalogKey(mapNpcsForCheck[offset])] = available;
									offset += 1;
								}
							}
							npcAvailability = next;
							api.refreshDetail();
						})
						.catch(() => {
							if (availabilityToken !== npcAvailabilityToken) return;
							const next = {};
							for (const npc of mapNpcsForCheck) next[npcCatalogKey(npc)] = false;
							npcAvailability = next;
							api.refreshDetail();
						});
				}
			}
			const target = selectedCoordinate ? { ...map, ...selectedCoordinate } : null;
			const routeTarget = target && !target.random ? target : null;
			const currentMap = getCurrentAdventureMap();
			const sameMap = normalizeAdventureMap(map.mapName) === currentMap;
			const currentPosition = getCurrentAdventurePosition();
			const routeMatches = Boolean(
				routeTarget &&
				routeState.target &&
				normalizeAdventureMap(routeState.target.mapName) === normalizeAdventureMap(routeTarget.mapName) &&
				routeState.target.x === routeTarget.x &&
				routeState.target.y === routeTarget.y
			);
			const routeActive = routeMatches && routeState.active;
			const targetActionState = getAdventureActionState(target);
			const canTeleport =
				target &&
				!target.random &&
				loadedMap &&
				Number.isFinite(target.x) &&
				Number.isFinite(target.y) &&
				targetActionState.canTeleport;
			const currentMapName =
				DB.getMapInfo(`${currentMap}.rsw`)?.displayName || DB.getMapName(currentMap, currentMap);
			const routeMessage = !sameMap ? '寻路仅支持角色当前所在地图' : routeMatches ? routeState.message : '';
			const mapNpcs = filterNpcsOnMap(catalogNpcs, map.mapName);
			const npcListScrollTop = detail.querySelector('.map-npc-scroll')?.scrollTop || 0;
			const selectedNpc = mapNpcs.find(npc => npcCatalogKey(npc) === selectedNpcKey);
			if (selectedNpc) {
				selectedCoordinate = { x: selectedNpc.x, y: selectedNpc.y };
			}
			const npcActionState = selectedNpc
				? { ...actionState, ...getAdventureActionState(selectedNpc) }
				: actionState;
			const canTeleportNpc = selectedNpc
				? npcTeleportEnabled(selectedNpc, npcAvailability[npcCatalogKey(selectedNpc)], npcActionState)
				: false;
			const canTeleportHere = selectedNpc ? canTeleportNpc : canTeleport;
			const npcStatus = actionState.kind === 'npc' ? actionState.message : '';
			const mapStatus =
				(actionState.kind === 'coordinate' ? actionState.message : '') ||
				routeMessage ||
				(!Session.NavigationTeleportAllowed ? '当前账号没有传送权限' : '');
			const selectionLabel = selectedNpc
				? `${selectedNpc.name} · ${selectedNpc.x}, ${selectedNpc.y}`
				: selectedCoordinate?.random
					? '随机位置'
					: selectedCoordinate
						? `${selectedCoordinate.x}, ${selectedCoordinate.y}`
						: '点击地图选择位置';
			detail.innerHTML = `<div class="map-heading"><div><h3>${escapeCatalogHtml(map.name)}</h3><p>${escapeCatalogHtml(map.id)}</p><small class="map-current-position">角色位置：${escapeCatalogHtml(currentMapName)} (${currentPosition.x}, ${currentPosition.y})</small></div><strong>${escapeCatalogHtml(selectionLabel)}</strong></div>
					<div class="map-detail-body">
					<button class="catalog-map-picker" type="button" aria-label="在${escapeCatalogHtml(map.name)}选择坐标"><canvas class="catalog-map" width="480" height="360"></canvas></button>
					<section class="map-npc-list" aria-label="${escapeCatalogHtml(map.name)}的 NPC">
						<h4>本地图 NPC${mapNpcs.length ? `（${mapNpcs.length}）` : ''}</h4>
						${
							mapNpcs.length
								? `<div class="map-npc-scroll"><ul>${mapNpcs
										.map(npc => {
											const npcKey = npcCatalogKey(npc);
											const available = npcAvailability[npcKey];
											return `<li class="map-npc-row${selectedNpcKey === npcKey ? ' selected' : ''}" data-npc-key="${escapeCatalogHtml(npcKey)}">
												<span class="map-npc-text"><strong>${escapeCatalogHtml(npc.name)}</strong><small>${npc.x}, ${npc.y} · ${escapeCatalogHtml(npcAvailabilityLabel(available))}</small></span>
											</li>`;
										})
										.join('')}</ul></div>`
								: '<p class="map-npc-empty">该地图没有可显示的 NPC</p>'
						}
					</section>
					</div>
					<div class="catalog-action-panel">
						<button class="catalog-route" type="button" ${routeTarget && sameMap ? '' : 'disabled'}>${routeActive ? '停止寻路' : '开始寻路'}</button>
					<button class="catalog-teleport" type="button" ${canTeleportHere ? '' : 'disabled'}>${actionState.npcPending && selectedNpc ? '正在传送...' : '传送到这里'}</button>
					<span class="catalog-status${(actionState.kind === 'coordinate' || actionState.kind === 'npc') && actionState.error ? ' error' : ''}">${escapeCatalogHtml(npcStatus || mapStatus)}</span>
				</div>`;
			const canvas = detail.querySelector('.catalog-map');
			const picker = detail.querySelector('.catalog-map-picker');
			let lastPositionKey = '';
			redrawPreview = () => {
				if (!canvas.isConnected) return;
				if (getCurrentAdventureMap() !== currentMap) {
					api.refreshDetail();
					return;
				}
				const position = getCurrentAdventurePosition();
				const positionKey = `${position.x}:${position.y}`;
				if (positionKey === lastPositionKey) return;
				lastPositionKey = positionKey;
				const label = detail.querySelector('.map-current-position');
				if (label) label.textContent = `角色位置：${currentMapName} (${position.x}, ${position.y})`;
				drawWorldMapPreview(
					canvas,
					loadedMap?.image,
					selectedCoordinate?.random ? null : selectedCoordinate,
					loadedMap?.gat,
					{
						path: sameMap && routeMatches ? routeState.path : [],
						player: sameMap ? position : null
					}
				);
			};
			redrawPreview();
			const npcList = detail.querySelector('.map-npc-scroll');
			if (npcList) npcList.scrollTop = npcListScrollTop;
			picker.addEventListener('click', event => {
				const raw = canvasToMapCoordinate(canvas, event, loadedMap?.gat);
				selectedNpcKey = '';
				selectedCoordinate = findNearestWalkableCoordinate(loadedMap?.gat, raw);
				const nextTarget = { ...map, ...selectedCoordinate };
				if (!sameMap || !previewAdventureRoute(nextTarget)) api.refreshDetail();
			});
			detail.querySelector('.catalog-route').addEventListener('click', () => {
				if (routeActive) stopAdventureRoute();
				else if (routeTarget) startAdventureRoute(routeTarget);
			});
			detail.querySelector('.catalog-teleport').addEventListener('click', () => {
				if (selectedNpc) teleportToNpc(selectedNpc);
				else if (target) teleportToCoordinate(target);
			});
			for (const row of detail.querySelectorAll('.map-npc-row')) {
				row.addEventListener('click', () => {
					selectedNpcKey = row.dataset.npcKey;
					api.refreshDetail();
				});
			}
		}
	});

	const unsubscribeActions = subscribeAdventureActions(state => {
		actionState = state;
		browser.refreshDetail();
	});
	const unsubscribeRoute = subscribeAdventureRoute(state => {
		routeState = state;
		browser.refreshDetail();
	});
	const positionTimer = setInterval(() => redrawPreview(), 500);
	Promise.all([loadNpcAssets(), loadAdventureNpcCatalog()])
		.then(async ([assets, npcCatalog]) => {
			catalogNpcs = npcCatalog.items;
			const mapsWithImages = new Set(assets.mapImages || []);
			const currentMap = normalizeAdventureMap(getCurrentAdventureMap());
			const currentChannel = getMapChannel(currentMap);
			const navigationMaps = await DB.listNavigation('MAP', {
				channelsEnabled: Session.NavigationMapChannelsEnabled
			});
			const items = toWorldEntities(navigationMaps).map(map => {
				const mapName = normalizeAdventureMap(map.mapName);
				const mapChannel = getMapChannel(mapName);
				const isCurrentMap =
					mapName === currentMap ||
					(!Session.NavigationMapChannelsEnabled &&
						currentChannel &&
						mapChannel?.canonicalMapName === currentChannel.canonicalMapName);
				const resolvedMapName = isCurrentMap ? currentMap : mapName;
				return {
					...map,
					mapName: resolvedMapName,
					hasImage: mapsWithImages.has(MiniMapTable[resolvedMapName] || resolvedMapName)
				};
			});
			browser.setItems(items);
			browser.selectItem(items.find(map => normalizeAdventureMap(map.mapName) === currentMap));
		})
		.catch(error => {
			console.error(error);
			browser.setStatus('地图资料加载失败');
		});

	return () => {
		loadToken += 1;
		npcAvailabilityToken += 1;
		thumbnailToken += 1;
		thumbnailObserver?.disconnect();
		clearInterval(positionTimer);
		redrawPreview = () => {};
		unsubscribeActions();
		unsubscribeRoute();
	};
}

export default { id: 'maps', label: '地图图鉴', mount };
