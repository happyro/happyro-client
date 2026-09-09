import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigationTables = vi.hoisted(() => ({ links: [], distances: [] }));

vi.mock('DB/DBManager.js', () => ({
	default: {
		getNavigationGraph: async () => ({
			links: navigationTables.links,
			linkDistances: navigationTables.distances,
			npcDistances: []
		})
	}
}));

import MapPathFinder from '../../src/UI/Components/Navigation/MapPathFinder.js';

describe('map path finder', () => {
	beforeEach(() => {
		navigationTables.links = [];
		navigationTables.distances = [];
	});

	it('returns a same-map destination directly without loading the graph', async () => {
		await expect(MapPathFinder.findPathBetweenMaps('prontera', 10, 20, 'prontera', 30, 40)).resolves.toEqual([
			{ map: 'prontera', x: 30, y: 40, warpId: null, warpType: null, warpName: '' }
		]);
	});

	it('finds a cross-map route through an allowed warp', async () => {
		navigationTables.links = [
			['prontera', 13350, 200, 45, '南门', '', 156, 20, 'prt_fild08', 170, 375]
		];

		const path = await MapPathFinder.findPathBetweenMaps(
			'prontera',
			150,
			50,
			'prt_fild08',
			200,
			200,
			[200]
		);

		expect(path).toEqual([
			{ map: 'prontera', x: 156, y: 20, warpId: 13350, warpType: 200, warpName: '南门' },
			{ map: 'prt_fild08', x: 200, y: 200, warpId: null, warpType: null, warpName: '' }
		]);
	});

	it('excludes service warps until their type is enabled', async () => {
		navigationTables.links = [
			['prontera', 13351, 202, 45, '卡普拉传送', '', 146, 89, 'geffen', 120, 40]
		];

		await expect(
			MapPathFinder.findPathBetweenMaps('prontera', 150, 50, 'geffen', 100, 100, [200, 201])
		).resolves.toBeNull();
		await expect(
			MapPathFinder.findPathBetweenMaps('prontera', 150, 50, 'geffen', 100, 100, [200, 201, 202])
		).resolves.toEqual([
			{
				map: 'prontera',
				x: 146,
				y: 89,
				warpId: 13351,
				warpType: 202,
				warpName: '卡普拉传送'
			},
			{ map: 'geffen', x: 100, y: 100, warpId: null, warpType: null, warpName: '' }
		]);
	});
});
