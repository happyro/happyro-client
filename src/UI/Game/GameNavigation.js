import DB from 'DB/DBManager.js';
import Session from 'Engine/SessionStorage.js';
import MapRenderer from 'Renderer/MapRenderer.js';
import MapPathFinder from 'UI/Components/Navigation/MapPathFinder.js';
import { toWorldEntities, normalizeWorldMapName } from 'UI/Components/GameTools/WorldCatalogService.js';

// Catalogue and route planning do not mount the desktop Navigation component.
export function createGameNavigation(canOperate) {
	const owner = Session.Entity;
	let revision = 0,
		disposed = false;
	let state = { results: [], target: null, route: [], pending: false, message: '' };
	const currentMap = () => normalizeWorldMapName(MapRenderer.currentMap);
	const active = () =>
		!disposed &&
		canOperate() &&
		Session.Playing &&
		Session.Entity === owner &&
		owner &&
		owner.action !== owner.ACTION.DIE;
	const snapshot = () => ({
		...state,
		currentMap: currentMap(),
		position: owner ? [Math.floor(owner.position[0]), Math.floor(owner.position[1])] : [0, 0],
		allowed: Boolean(active())
	});
	return {
		snapshot,
		async search(query, type = 'ALL', scope = 'WORLD') {
			if (!active()) return;
			const request = ++revision,
				map = currentMap();
			state = { ...state, results: [], pending: true, message: '' };
			try {
				const rows = query.trim()
					? await DB.searchNavigation(query.trim(), type, {
							currentMap: map,
							scope,
							channelsEnabled: Session.NavigationMapChannelsEnabled
						})
					: [];
				if (request !== revision || !active()) return;
				if (currentMap() !== map) {
					state.message = '地图已变化，请重新搜索';
					return;
				}
				state = { ...state, results: toWorldEntities(rows), message: rows.length ? '' : '没有匹配的目的地' };
			} catch {
				if (request === revision && active()) state.message = '目的地目录加载失败，请重试';
			} finally {
				if (request === revision) state.pending = false;
			}
		},
		async plan(destination) {
			if (!active()) return false;
			const map = normalizeWorldMapName(destination.mapName),
				x = Number(destination.x),
				y = Number(destination.y);
			if (
				destination.x === '' ||
				destination.y === '' ||
				destination.x == null ||
				destination.y == null ||
				!/^[a-z0-9_@-]+$/.test(map) ||
				!Number.isInteger(x) ||
				!Number.isInteger(y) ||
				x < 0 ||
				y < 0 ||
				x > 1023 ||
				y > 1023
			) {
				state.message = '请填写有效地图和整数坐标（0–1023）';
				return false;
			}
			const request = ++revision,
				start = currentMap(),
				position = snapshot().position;
			state = {
				...state,
				target: { mapName: map, x, y, name: destination.name || map },
				route: [],
				pending: true,
				message: '正在计算路径'
			};
			try {
				const route = await MapPathFinder.findPathBetweenMaps(start, ...position, map, x, y, [200, 201]);
				if (request !== revision || !active()) return false;
				if (currentMap() !== start) {
					state.message = '地图已变化，请重新规划';
					return false;
				}
				state.route = route || [];
				state.message = state.route.length
					? '跨地图路线已规划；地图内可达性须由行走路径确认'
					: '未找到通往目的地的路线';
				return Boolean(state.route.length);
			} catch {
				if (request === revision && active()) state.message = '路径计算失败，请重试';
				return false;
			} finally {
				if (request === revision) state.pending = false;
			}
		},
		cancel() {
			revision++;
			state = { ...state, pending: false, route: [], target: null, message: '' };
		},
		destroy() {
			disposed = true;
			revision++;
		}
	};
}
