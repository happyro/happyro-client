import { matchesCatalogSearch, normalizeCatalogSearch, paginateCatalog } from './CatalogData.js';
import { isVisibleMapChannel } from '../../../DB/Map/MapChannels.js';

export function normalizeMonsterSearch(value) {
	return normalizeCatalogSearch(value);
}

export function filterMonsters(monsters, search, category = 'all') {
	const term = normalizeMonsterSearch(search);
	return monsters.filter(monster => {
		if (category === 'boss' && !monster.boss) return false;
		if (category === 'normal' && monster.boss) return false;
		if (!term) return true;
		return matchesCatalogSearch([monster.id, monster.name, monster.nameEn, monster.aegisName], term);
	});
}

export function paginateMonsters(monsters, page, pageSize) {
	return paginateCatalog(monsters, page, pageSize);
}

export function listMonsterSpawnMaps(spawns = [], options = {}) {
	const currentMap = String(options.currentMap || '').toLocaleLowerCase();
	return spawns
		.filter(spawn => isVisibleMapChannel(spawn.mapName, Boolean(options.channelsEnabled)))
		.sort(
			(left, right) =>
				Number(right.mapName === currentMap) - Number(left.mapName === currentMap) ||
				right.count - left.count ||
				left.mapName.localeCompare(right.mapName)
		);
}

export function getMonsterSpawnMapNames(spawns, navigationMaps) {
	const names = new Map(navigationMaps.map(map => [map.mapName, map.mapDisplayName || map.name]));
	return new Map(spawns.map(spawn => [spawn.mapName, names.get(spawn.mapName) || spawn.mapName]));
}
