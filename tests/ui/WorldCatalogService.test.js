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

	it('keeps server NPC instances even when official navigation has no matching row', () => {
		const catalog = mergeNpcCatalog([], mapName => mapName);
		expect(catalog.length).toBeGreaterThan(10000);
		expect(catalog.some(npc => npc.source === 'server' && !npc.capabilities.canTeleportToNpc)).toBe(true);
	});
});
