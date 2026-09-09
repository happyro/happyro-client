import DB from 'DB/DBManager.js';
import Session from 'Engine/SessionStorage.js';
import { mountCatalogBrowser } from './CatalogBrowser.js';
import { escapeCatalogHtml } from './CatalogData.js';
import {
	getAdventureActionState,
	getCurrentAdventureMap,
	getCurrentAdventurePosition,
	normalizeAdventureMap,
	subscribeAdventureActions,
	teleportToCoordinate
} from './AdventureActionService.js';
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
import { toWorldEntities } from './WorldCatalogService.js';

function filterMaps(maps, search, scope) {
	return filterAndSortMaps(maps, search, scope, getCurrentAdventureMap());
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
				const token = ++loadToken;
				loadCatalogMap(map.mapName).then(resource => {
					if (token !== loadToken) return;
					loadedMap = resource;
					selectedCoordinate = findDefaultMapCoordinate(resource?.gat) || selectedCoordinate;
					api.refreshDetail();
				});
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
			const canTeleport = target && targetActionState.canTeleport;
			const currentMapName =
				DB.getMapInfo(`${currentMap}.rsw`)?.displayName || DB.getMapName(currentMap, currentMap);
			const routeMessage = !sameMap ? '寻路仅支持角色当前所在地图' : routeMatches ? routeState.message : '';
			detail.innerHTML = `<div class="map-heading"><div><h3>${escapeCatalogHtml(map.name)}</h3><p>${escapeCatalogHtml(map.id)}</p><small class="map-current-position">角色位置：${escapeCatalogHtml(currentMapName)} (${currentPosition.x}, ${currentPosition.y})</small></div><strong>${selectedCoordinate?.random ? '随机位置' : selectedCoordinate ? `${selectedCoordinate.x}, ${selectedCoordinate.y}` : '点击地图选择位置'}</strong></div>
					<button class="catalog-map-picker" type="button" aria-label="在${escapeCatalogHtml(map.name)}选择坐标"><canvas class="catalog-map" width="480" height="360"></canvas></button>
					<div class="catalog-action-panel">
						<button class="catalog-route" type="button" ${routeTarget && sameMap ? '' : 'disabled'}>${routeActive ? '停止寻路' : '开始寻路'}</button>
					<button class="catalog-teleport" type="button" ${canTeleport ? '' : 'disabled'}>传送到这里</button>
					<span class="catalog-status${actionState.kind === 'coordinate' && actionState.error ? ' error' : ''}">${escapeCatalogHtml((actionState.kind === 'coordinate' ? actionState.message : '') || routeMessage || (!Session.NavigationTeleportAllowed ? '当前账号没有传送权限' : ''))}</span>
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
			picker.addEventListener('click', event => {
				const raw = canvasToMapCoordinate(canvas, event, loadedMap?.gat);
				selectedCoordinate = findNearestWalkableCoordinate(loadedMap?.gat, raw);
				const nextTarget = { ...map, ...selectedCoordinate };
				if (!sameMap || !previewAdventureRoute(nextTarget)) api.refreshDetail();
			});
			detail.querySelector('.catalog-route').addEventListener('click', () => {
				if (routeActive) stopAdventureRoute();
				else if (routeTarget) startAdventureRoute(routeTarget);
			});
			detail.querySelector('.catalog-teleport').addEventListener('click', () => {
				if (target) teleportToCoordinate(target);
			});
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
	loadNpcAssets()
		.then(async assets => {
			const mapsWithImages = new Set(assets.mapImages || []);
			const navigationMaps = await DB.listNavigation('MAP', {
				channelsEnabled: Session.NavigationMapChannelsEnabled
			});
			const items = toWorldEntities(navigationMaps).map(map => ({
				...map,
				hasImage: mapsWithImages.has(map.id.toLocaleLowerCase())
			}));
			browser.setItems(items);
			const currentMap = normalizeAdventureMap(getCurrentAdventureMap());
			browser.selectItem(items.find(map => normalizeAdventureMap(map.mapName) === currentMap));
		})
		.catch(error => {
			console.error(error);
			browser.setStatus('地图资料加载失败');
		});

	return () => {
		loadToken += 1;
		thumbnailToken += 1;
		thumbnailObserver?.disconnect();
		clearInterval(positionTimer);
		redrawPreview = () => {};
		unsubscribeActions();
		unsubscribeRoute();
	};
}

export default { id: 'maps', label: '地图图鉴', mount };
