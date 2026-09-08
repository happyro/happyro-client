import { describe, expect, it } from 'vitest';
import { filterAndSortMaps, mapCatalogRank } from '../../src/UI/Components/GameTools/MapCatalogData.js';

const maps = [
	{ id: 'pvp_y_1-1', mapName: 'pvp_y_1-1', name: 'PvP：普隆德拉房间', hasImage: false },
	{ id: 'gef_dun01', mapName: 'gef_dun01', name: '吉芬地下城 1F', hasImage: true },
	{ id: 'prontera', mapName: 'prontera', name: '普隆德拉', hasImage: true },
	{ id: 'payon', mapName: 'payon', name: '斐扬', hasImage: true },
	{ id: 'prt_fild01', mapName: 'prt_fild01', name: '普隆德拉东部', hasImage: false }
];

describe('map catalog data', () => {
	it('orders the current map and common destinations before fields, dungeons and PvP maps', () => {
		expect(filterAndSortMaps(maps, '', 'all', 'payon').map(map => map.id)).toEqual([
			'payon',
			'prontera',
			'gef_dun01',
			'prt_fild01',
			'pvp_y_1-1'
		]);
	});

	it('places maps with verified images before maps without images', () => {
		const ordered = filterAndSortMaps(maps, '', 'all', '').map(map => map.id);
		expect(ordered.indexOf('gef_dun01')).toBeLessThan(ordered.indexOf('prt_fild01'));
	});

	it('keeps exact search matches ahead of category order', () => {
		expect(filterAndSortMaps(maps, 'pvp_y_1-1', 'all', '').map(map => map.id)).toEqual(['pvp_y_1-1']);
	});

	it('classifies PvP maps behind ordinary destinations', () => {
		expect(mapCatalogRank(maps[0])[0]).toBeGreaterThan(mapCatalogRank(maps[4])[0]);
	});
});
