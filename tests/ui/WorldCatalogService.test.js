import { describe, expect, it } from 'vitest';
import {
	entityKey,
	mergeNpcCatalog,
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
});
