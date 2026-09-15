import { describe, expect, it } from 'vitest';
import {
	entityKey,
	npcTeleportEnabled,
	toCatalogNpcs,
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

	it('adapts adventure-tools rows into teleportable world entities', () => {
		const [npc] = toCatalogNpcs([
			{
				id: 'prontera:150:180:Kafra#prt',
				map: 'Prontera.GAT',
				map_name_zh_cn: '普隆德拉',
				x: 150,
				y: 180,
				name: 'Kafra#prt',
				source_name: 'Kafra Employee',
				display_name: '卡普拉员工',
				type: 'script',
				display_sprite_id: 117,
				navigation: { id: 1, class: 4 },
				catalog_order: 7
			}
		]);

		expect(npc).toMatchObject({
			type: 'NPC',
			name: '卡普拉员工',
			sourceName: 'Kafra Employee',
			mapName: 'prontera',
			mapDisplayName: '普隆德拉',
			x: 150,
			y: 180,
			npcClass: 4,
			spriteId: 117,
			source: 'server'
		});
		expect(npc.capabilities.canTeleportToNpc).toBe(true);
	});

	it('leaves rows without a navigation class non-teleportable', () => {
		const [npc] = toCatalogNpcs([
			{ id: 'payon:1:1:Sign', map: 'payon', x: 1, y: 1, display_name: '告示牌', navigation: null }
		]);

		expect(npc.npcClass).toBeNull();
		expect(npc.capabilities.canTeleportToNpc).toBe(false);
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
