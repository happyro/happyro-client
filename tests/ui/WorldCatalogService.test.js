import { describe, expect, it } from 'vitest';
import {
	entityKey,
	filterNpcsOnMap,
	mergeNpcCatalog,
	npcTeleportEnabled,
	toWorldEntity
} from '../../src/UI/Components/GameTools/WorldCatalogService.js';

describe('WorldCatalogService', () => {
	it('normalizes navigation entities and exposes capabilities', () => {
		const entity = toWorldEntity({ type: 'NPC', mapName: 'Prontera.GAT', x: 10.8, y: 20.9, npcClass: 123 });
		expect(entity).toMatchObject({
			type: 'NPC',
			mapName: 'prontera',
			x: 10,
			y: 20,
			hasCoordinates: true,
			capabilities: { canRoute: true, canTeleportToMap: true, canTeleportToNpc: true }
		});
		expect(entityKey(entity)).toBe('NPC:prontera:10:20:123');
	});

	it('classifies official map-link markers as non-interactive warps', () => {
		const entity = toWorldEntity({ type: 'NPC', mapName: 'abbey01', x: 87, y: 122, npcClass: 99999 });
		expect(entity.type).toBe('WARP');
		expect(entity.capabilities.canTeleportToNpc).toBe(false);
		expect(entity.capabilities.canRoute).toBe(true);
	});

	it('only exposes server NPC instances with a teleport identity', () => {
		const catalog = mergeNpcCatalog([], mapName => mapName);
		expect(catalog).toHaveLength(4410);
		expect(catalog.every(npc => npc.source === 'server+navigation')).toBe(true);
		expect(catalog.every(npc => npc.capabilities.canTeleportToNpc)).toBe(true);
		expect(catalog.every(npc => Number.isFinite(npc.spriteId))).toBe(true);
		expect(catalog.some(npc => npc.npcClass !== npc.spriteId)).toBe(true);
	});

	it('filters the shared NPC catalog down to one map', () => {
		const npcs = [
			{ mapName: 'prontera', name: '卡普拉', x: 150, y: 180, type: 'NPC' },
			{ mapName: 'payon', name: '铁匠', x: 88, y: 99, type: 'NPC' },
			{ mapName: 'PAYON.gat', name: '仓库', x: 10, y: 20, type: 'NPC' }
		];
		expect(filterNpcsOnMap(npcs, 'payon').map(npc => npc.name)).toEqual(['仓库', '铁匠']);
		expect(filterNpcsOnMap(npcs, 'Prontera.GAT').map(npc => npc.name)).toEqual(['卡普拉']);
		expect(filterNpcsOnMap(npcs, '').map(npc => npc.name)).toEqual([]);
	});
});

describe('npc teleport enablement', () => {
	const npc = { type: 'NPC', npcClass: 123, mapName: 'payon', x: 10, y: 20 };
	const ready = { canTeleport: true, npcPending: false };

	it('enables teleport only when availability and existing action rules pass', () => {
		expect(npcTeleportEnabled(npc, true, ready)).toBe(true);
		expect(npcTeleportEnabled(npc, false, ready)).toBe(false);
		expect(npcTeleportEnabled(npc, true, { canTeleport: false, npcPending: false })).toBe(false);
		expect(npcTeleportEnabled({ ...npc, type: 'WARP' }, true, ready)).toBe(false);
	});
});
