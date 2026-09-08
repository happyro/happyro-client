/**
 * Shared world-entity model used by Navigation and the adventure catalogues.
 *
 * Navigation tables are client supplied hints.  This module gives every
 * consumer the same entity shape and, importantly, keeps static data separate
 * from capabilities that must be checked by the server.
 */
export const WORLD_ENTITY_TYPES = Object.freeze({
	NPC: 'NPC',
	MOB: 'MOB',
	MAP: 'MAP',
	WARP: 'WARP'
});

export function toWorldEntity(result) {
	if (!result || !result.type || !result.mapName) return null;
	// The official Navi_Npc table also contains map-link markers.  Class 99999
	// is the client convention used by those records; do not expose them as
	// interactive NPCs or offer NPC teleport for them.
	const type =
		result.type === 'NPC' && Number(result.npcClass) === 99999
			? WORLD_ENTITY_TYPES.WARP
			: result.type === 'NPC' && result.npcClass > 0
				? WORLD_ENTITY_TYPES.NPC
				: result.type;
	const hasCoordinates = Number.isFinite(result.x) && Number.isFinite(result.y);
	return {
		...result,
		entityId: [
			type,
			String(result.mapName)
				.replace(/\.gat$/i, '')
				.toLocaleLowerCase(),
			hasCoordinates ? Math.floor(result.x) : '',
			hasCoordinates ? Math.floor(result.y) : '',
			result.npcClass ?? result.id ?? ''
		].join(':'),
		type,
		mapName: String(result.mapName)
			.replace(/\.gat$/i, '')
			.toLocaleLowerCase(),
		x: hasCoordinates ? Math.floor(result.x) : null,
		y: hasCoordinates ? Math.floor(result.y) : null,
		hasCoordinates,
		// Static navigation data never grants an operation by itself.
		capabilities: {
			canRoute: hasCoordinates,
			canTeleportToMap: hasCoordinates,
			canTeleportToNpc: type === WORLD_ENTITY_TYPES.NPC && hasCoordinates && Number.isFinite(result.npcClass),
			canSummon: type === WORLD_ENTITY_TYPES.MOB
		},
		availability: 'unknown'
	};
}

export function toWorldEntities(results) {
	return (results || []).map(toWorldEntity).filter(Boolean);
}

import NpcInstanceNameTable from 'DB/Navigation/NpcInstanceNameTable.js';

/**
 * Build the NPC catalogue from server NPC instances and enrich matching rows
 * with official navigation metadata. Server-only NPCs remain browseable but
 * cannot request NPC teleport until a live class identity is available.
 */
export function mergeNpcCatalog(navigationResults, localizeMap) {
	const navigation = toWorldEntities(navigationResults).filter(entity => entity.type === WORLD_ENTITY_TYPES.NPC);
	const navigationByPosition = new Map();
	for (const entity of navigation) {
		const position = `${entity.mapName}:${entity.x}:${entity.y}`;
		if (!navigationByPosition.has(position)) navigationByPosition.set(position, entity);
	}

	return Object.entries(NpcInstanceNameTable).map(([position, instance]) => {
		const [mapName, x, y] = position.split(':');
		const matched = navigationByPosition.get(position);
		return toWorldEntity({
			...(matched || {}),
			type: WORLD_ENTITY_TYPES.NPC,
			id: matched?.id || position,
			name: instance.name,
			sourceName: instance.sourceName,
			rawName: matched?.rawName || instance.sourceName,
			aliases: matched?.aliases || [],
			mapName,
			mapDisplayName: matched?.mapDisplayName || localizeMap(mapName),
			x: Number(x),
			y: Number(y),
			npcClass: Number.isFinite(matched?.npcClass) ? matched.npcClass : null,
			source: matched ? 'server+navigation' : 'server'
		});
	});
}

export function entityKey(entity) {
	if (!entity) return '';
	return [entity.type, entity.mapName, entity.x ?? '', entity.y ?? '', entity.npcClass ?? entity.id ?? ''].join(':');
}
