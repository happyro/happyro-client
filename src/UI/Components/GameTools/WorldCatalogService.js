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

/**
 * Adapt one adventure-tools NPC row into the shared world entity shape used by
 * teleport, availability checks and the map preview.
 */
export function toCatalogNpc(row) {
	const npcClass = Number.isFinite(row.navigation?.class) ? row.navigation.class : null;
	return toWorldEntity({
		type: WORLD_ENTITY_TYPES.NPC,
		id: row.id,
		name: row.display_name,
		sourceName: row.source_name,
		rawName: row.name,
		mapName: row.map,
		mapDisplayName: row.map_name_zh_cn || row.map,
		x: row.x,
		y: row.y,
		npcClass,
		spriteId: Number.isFinite(row.display_sprite_id) ? row.display_sprite_id : null,
		catalogOrder: row.catalog_order,
		scriptType: row.type,
		source: 'server'
	});
}

export function toCatalogNpcs(rows) {
	return (rows || []).map(toCatalogNpc);
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
