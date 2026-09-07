import { describe, expect, it } from 'vitest';
import { filterMonsters, normalizeMonsterSearch, paginateMonsters } from '../../src/UI/Components/GameTools/MonsterCatalogData.js';

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

	it('clamps pagination to a valid page', () => {
		expect(paginateMonsters(monsters, 9, 1)).toEqual({ page: 2, pageCount: 2, items: [monsters[1]] });
	});
});
