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
export function searchNavigationRows(npcRows, mobRows, query, type, localizers) {
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
			const rawName = npc[4] || '';
			const localizedName = localizers.npc(rawName) || rawName;
			const aliases = localizers.npcAliases?.(rawName) || [];
			if (!rawName || !matches(rawName, localizedName, aliases)) continue;

			results.push({
				type: 'NPC',
				id: npc[1],
				name: localizedName,
				mapName: npc[0],
				mapDisplayName: localizers.map(npc[0]),
				x: npc[6],
				y: npc[7]
			});
		}
	}

	if (type === 'ALL' || type === 'MOB') {
		for (const mob of mobRows) {
			if (!Array.isArray(mob)) continue;
			const rawName = mob[4] || '';
			const mobId = Number(mob[3]) & 0xffff;
			const localizedName = localizers.mob(mobId, rawName) || rawName;
			if (!rawName || !matches(rawName, localizedName, mob[5])) continue;

			results.push({
				type: 'MOB',
				id: mobId,
				name: localizedName,
				mapName: mob[0],
				mapDisplayName: localizers.map(mob[0]),
				x: null,
				y: null
			});
		}
	}

	return results.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 50);
}
