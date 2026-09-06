import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigationTables = vi.hoisted(() => ({ links: [], distances: [] }));

vi.mock('DB/DBManager.js', () => ({
	default: {
		getNaviLinkTable: () => navigationTables.links,
		getNaviLinkDistanceTable: () => navigationTables.distances
	}
}));

import MapPathFinder from '../../src/UI/Components/Navigation/MapPathFinder.js';

describe('map path finder', () => {
	beforeEach(() => {
		navigationTables.links = [];
		navigationTables.distances = [];
	});

	it('returns a same-map destination directly', () => {
		expect(MapPathFinder.findPathBetweenMaps('prontera', 10, 20, 'prontera', 30, 40)).toEqual([
			{ map: 'prontera', x: 30, y: 40, warpId: null }
		]);
	});

	it('finds a cross-map route through an allowed warp', () => {
		navigationTables.links = [
			['prontera', 13350, 200, 45, '南门', '', 156, 20, 'prt_fild08', 170, 375]
		];

		const path = MapPathFinder.findPathBetweenMaps(
			'prontera',
			150,
			50,
			'prt_fild08',
			200,
			200,
			[200]
		);

		expect(path).toEqual([
			{ map: 'prontera', x: 156, y: 20, warpId: 13350 },
			{ map: 'prt_fild08', x: 200, y: 200, warpId: null }
		]);
	});

	it('excludes service warps until their type is enabled', () => {
		navigationTables.links = [
			['prontera', 13351, 202, 45, '卡普拉传送', '', 146, 89, 'geffen', 120, 40]
		];

		expect(
			MapPathFinder.findPathBetweenMaps('prontera', 150, 50, 'geffen', 100, 100, [200, 201])
		).toBeNull();
		expect(
			MapPathFinder.findPathBetweenMaps('prontera', 150, 50, 'geffen', 100, 100, [200, 201, 202])
		).toHaveLength(2);
	});
});
