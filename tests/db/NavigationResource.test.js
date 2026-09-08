import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	loadNavigationCatalog,
	loadNavigationGraph,
	resetNavigationResources
} from '../../src/DB/Navigation/NavigationResource.js';

describe('navigation resources', () => {
	beforeEach(() => {
		resetNavigationResources();
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('loads and caches the catalog independently from the graph', async () => {
		fetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ schemaVersion: 1, maps: [], monsters: [], npcs: [] })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ schemaVersion: 1, links: [], linkDistances: [], npcDistances: [] })
			});

		const firstCatalog = await loadNavigationCatalog();
		const secondCatalog = await loadNavigationCatalog();
		expect(firstCatalog).toBe(secondCatalog);
		expect(fetch).toHaveBeenCalledTimes(1);

		await loadNavigationGraph();
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(fetch.mock.calls[0][0].pathname).toContain('/data/navigation/catalog.json');
		expect(fetch.mock.calls[1][0].pathname).toContain('/data/navigation/graph.json');
	});

	it('rejects invalid resources and permits a later retry', async () => {
		fetch
			.mockResolvedValueOnce({ ok: true, json: async () => ({ schemaVersion: 1 }) })
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ schemaVersion: 1, maps: [], monsters: [], npcs: [] })
			});

		await expect(loadNavigationCatalog()).rejects.toThrow('data is invalid');
		await expect(loadNavigationCatalog()).resolves.toMatchObject({ schemaVersion: 1 });
		expect(fetch).toHaveBeenCalledTimes(2);
	});
});
