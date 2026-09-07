import { getMapChannelDisplayName, isVisibleMapChannel } from '../Map/MapChannels.js';

/**
 * Replace a navigation table with the sequential rows extracted from Lua.
 *
 * @param {Array} target
 * @param {Array|Object} rows
 */
export function replaceNavigationRows(target, rows) {
	target.length = 0;
	if (!rows || typeof rows !== 'object') return;

	const indexes = Object.keys(rows)
		.map(Number)
		.filter(Number.isInteger)
		.sort((a, b) => a - b);
	for (const index of indexes) {
		target.push(rows[index]);
	}
}

/**
 * Search loaded navigation rows using both resource and localized names.
 *
 * @param {Array} npcRows
 * @param {Array} mobRows
 * @param {string} query
 * @param {string} type
 * @param {Object} localizers
 * @returns {Array}
 */
export function searchNavigationRows(npcRows, mobRows, query, type, localizers, channelsEnabled = false) {
	const normalizedQuery = String(query || '')
		.trim()
		.toLocaleLowerCase();
	if (normalizedQuery.length < 2) return [];

	const results = [];
	const matches = (...names) =>
		names.flat().some(name =>
			String(name || '')
				.toLocaleLowerCase()
				.includes(normalizedQuery)
		);

	if (type === 'ALL' || type === 'NPC') {
		for (const npc of npcRows) {
			if (!Array.isArray(npc)) continue;
			if (!isVisibleMapChannel(npc[0], channelsEnabled)) continue;
			const rawName = npc[4] || '';
			const localizedName = localizers.npc(rawName) || rawName;
			const aliases = localizers.npcAliases?.(rawName) || [];
			if (!rawName || !matches(rawName, localizedName, aliases)) continue;

			results.push({
				type: 'NPC',
				id: npc[1],
				name: localizedName,
				mapName: npc[0],
				mapDisplayName: getMapChannelDisplayName(npc[0], localizers.map(npc[0]), channelsEnabled),
				x: npc[6],
				y: npc[7]
			});
		}
	}

	if (type === 'ALL' || type === 'MOB') {
		for (const mob of mobRows) {
			if (!Array.isArray(mob)) continue;
			if (!isVisibleMapChannel(mob[0], channelsEnabled)) continue;
			const rawName = mob[4] || '';
			const mobId = Number(mob[3]) & 0xffff;
			const localizedName = localizers.mob(mobId, rawName) || rawName;
			if (!rawName || !matches(rawName, localizedName, mob[5])) continue;

			results.push({
				type: 'MOB',
				id: mobId,
				name: localizedName,
				mapName: mob[0],
				mapDisplayName: getMapChannelDisplayName(mob[0], localizers.map(mob[0]), channelsEnabled),
				x: null,
				y: null
			});
		}
	}

	return results.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 50);
}

export function searchNavigationMaps(worldMaps, mapInfo, query, type, localizeMap, channelsEnabled = false) {
	if (type !== 'ALL' && type !== 'MAP') return [];
	const normalizedQuery = String(query || '')
		.trim()
		.toLocaleLowerCase();
	if (normalizedQuery.length < 2) return [];

	const results = new Map();
	for (const world of worldMaps || []) {
		for (const map of world.maps || []) {
			const id = String(map.id || '');
			if (!id || results.has(id)) continue;
			if (!isVisibleMapChannel(id, channelsEnabled)) continue;
			const baseName = map.name || localizeMap(id);
			const name = getMapChannelDisplayName(id, baseName, channelsEnabled);
			if (
				!id.toLocaleLowerCase().includes(normalizedQuery) &&
				!baseName.toLocaleLowerCase().includes(normalizedQuery)
			) {
				continue;
			}
			results.set(id, {
				type: 'MAP',
				id,
				name,
				mapName: id,
				mapDisplayName: name,
				x: null,
				y: null
			});
		}
	}
	for (const [resourceName, info] of Object.entries(mapInfo || {})) {
		const id = resourceName.replace(/\.(?:rsw|gat)$/i, '');
		if (!id || results.has(id)) continue;
		if (!isVisibleMapChannel(id, channelsEnabled)) continue;
		const baseName = info.displayName || localizeMap(id);
		const name = getMapChannelDisplayName(id, baseName, channelsEnabled);
		if (!id.toLocaleLowerCase().includes(normalizedQuery) && !baseName.toLocaleLowerCase().includes(normalizedQuery)) {
			continue;
		}
		results.set(id, {
			type: 'MAP',
			id,
			name,
			mapName: id,
			mapDisplayName: name,
			x: null,
			y: null
		});
	}
	const matchRank = result => {
		const id = result.id.toLocaleLowerCase();
		const name = result.name.toLocaleLowerCase();
		if (id === normalizedQuery || name === normalizedQuery) return 0;
		if (id.startsWith(normalizedQuery) || name.startsWith(normalizedQuery)) return 1;
		return 2;
	};
	return [...results.values()]
		.sort((a, b) => matchRank(a) - matchRank(b) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
		.slice(0, 50);
}
