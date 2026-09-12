import { describe, expect, it } from 'vitest';
import {
	filterMonsters,
	getMonsterSpawnMapNames,
	listMonsterSpawnMaps,
	normalizeMonsterSearch,
	paginateMonsters
} from '../../src/UI/Components/GameTools/MonsterCatalogData.js';

const monsters = [
	{ id: 1002, name: '波利', nameEn: 'Poring', aegisName: 'PORING', boss: false },
	{ id: 1039, name: '兽人英雄', nameEn: 'Orc Hero', aegisName: 'ORC_HERO', boss: true }
];

describe('monster catalog data', () => {
	it('normalizes and searches localized names, resource names and ids', () => {
		expect(normalizeMonsterSearch('  PORING ')).toBe('poring');
		expect(filterMonsters(monsters, '波利')).toEqual([monsters[0]]);
		expect(filterMonsters(monsters, 'orc_hero')).toEqual([monsters[1]]);
		expect(filterMonsters(monsters, '1002')).toEqual([monsters[0]]);
	});

	it('filters boss classification independently from search', () => {
		expect(filterMonsters(monsters, '', 'normal')).toEqual([monsters[0]]);
		expect(filterMonsters(monsters, '', 'boss')).toEqual([monsters[1]]);
	});

	it('limits monsters to the current spawn map when scoped to the current map', () => {
		const withSpawns = [
			{ ...monsters[0], spawns: [{ mapName: 'prt_fild08' }] },
			{ ...monsters[1], spawns: [{ mapName: 'gef_fild00' }] }
		];
		expect(
			filterMonsters(withSpawns, '', 'all', {
				scope: 'current',
				currentMap: 'prt_fild08',
				channelsEnabled: false
			})
		).toEqual([withSpawns[0]]);
	});

	it('clamps pagination to a valid page', () => {
		expect(paginateMonsters(monsters, 9, 1)).toEqual({ page: 2, pageCount: 2, items: [monsters[1]] });
	});

	it('prioritizes the current spawn map and hides optional channels', () => {
		const spawns = [
			{ mapName: 'gef_fild00', count: 34 },
			{ mapName: 'prt_fild08a', count: 110 },
			{ mapName: 'prt_fild08', count: 130 },
			{ mapName: 'jor_tail', count: 20 }
		];
		expect(listMonsterSpawnMaps(spawns, { currentMap: 'gef_fild00', channelsEnabled: false })).toEqual([
			spawns[0],
			spawns[2]
		]);
		expect(listMonsterSpawnMaps(spawns, { currentMap: 'gef_fild00', channelsEnabled: true })).toEqual([
			spawns[0],
			spawns[2],
			spawns[1]
		]);
	});

	it('uses detailed world map names to distinguish spawn maps with the same short title', () => {
		const spawns = [{ mapName: 'moc_fild11' }, { mapName: 'moc_fild18' }];
		const names = getMonsterSpawnMapNames(spawns, [
			{ mapName: 'moc_fild11', mapDisplayName: '梦罗克原野 11 - 苏格拉特沙漠' },
			{ mapName: 'moc_fild18', mapDisplayName: '梦罗克原野 18 - 苏格拉特沙漠' }
		]);
		expect([...names.values()]).toEqual([
			'梦罗克原野 11 - 苏格拉特沙漠',
			'梦罗克原野 18 - 苏格拉特沙漠'
		]);
	});
});
