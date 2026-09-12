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

import NpcCatalog from 'DB/Navigation/NpcCatalog.json';

/**
 * Build the adventure NPC catalogue from server instances that have an
 * official navigation identity and can therefore request NPC teleport.
 */
export function mergeNpcCatalog(navigationResults, localizeMap) {
	const navigation = toWorldEntities(navigationResults).filter(entity => entity.type === WORLD_ENTITY_TYPES.NPC);
	const navigationByPosition = new Map();
	for (const entity of navigation) {
		const position = `${entity.mapName}:${entity.x}:${entity.y}`;
		if (!navigationByPosition.has(position)) navigationByPosition.set(position, entity);
	}

	return NpcCatalog.entries
		.map(instance => {
			const position = `${instance.map}:${instance.x}:${instance.y}`;
			const matched = navigationByPosition.get(position);
			const npcClass = Number.isFinite(matched?.npcClass)
				? matched.npcClass
				: Number.isFinite(instance.navigation_class)
					? instance.navigation_class
					: null;
			return toWorldEntity({
				...(matched || {}),
				type: WORLD_ENTITY_TYPES.NPC,
				id: matched?.id || instance.navigation_id || instance.id,
				name: instance.name,
				sourceName: instance.source_name,
				rawName: matched?.rawName || instance.source_name,
				aliases: matched?.aliases || [],
				mapName: instance.map,
				mapDisplayName: matched?.mapDisplayName || localizeMap(instance.map),
				x: instance.x,
				y: instance.y,
				npcClass,
				spriteId: Number.isFinite(instance.display_sprite_id) ? instance.display_sprite_id : null,
				catalogOrder: instance.catalog_order,
				gameVisible: instance.game_visible,
				scriptType: instance.type,
				source: 'server+navigation'
			});
		})
		.filter(npc => npc.gameVisible);
}

export function entityKey(entity) {
	if (!entity) return '';
	return [entity.type, entity.mapName, entity.x ?? '', entity.y ?? '', entity.npcClass ?? entity.id ?? ''].join(':');
}

export function npcCatalogKey(npc) {
	if (!npc) return '';
	return `${npc.mapName}:${npc.x}:${npc.y}:${npc.npcClass}:${npc.id}`;
}

export function normalizeWorldMapName(mapName) {
	return String(mapName || '')
		.replace(/\.gat$/i, '')
		.toLocaleLowerCase();
}

export function npcTeleportEnabled(npc, available, actionState) {
	return Boolean(
		actionState?.canTeleport &&
			!actionState.npcPending &&
			available === true &&
			npc?.type === 'NPC' &&
			Number.isFinite(npc.npcClass)
	);
}

export function filterNpcsOnMap(npcs, mapName) {
	const map = normalizeWorldMapName(mapName);
	if (!map) return [];
	return (npcs || [])
		.filter(npc => normalizeWorldMapName(npc.mapName || npc.map) === map)
		.sort(
			(left, right) =>
				String(left.name || left.display_name || '').localeCompare(String(right.name || right.display_name || '')) ||
				(left.x ?? 0) - (right.x ?? 0) ||
				(left.y ?? 0) - (right.y ?? 0)
		);
}
