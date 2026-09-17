import { describe, expect, it } from 'vitest';
import {
	catalogScopeLabel,
	formatCatalogCount,
	matchesCatalogSearch,
	normalizeCatalogSearch,
	paginateCatalog,
	renderCatalogScopeFilter
} from '../../src/UI/Components/GameTools/CatalogData.js';

describe('catalog data', () => {
	it('normalizes and matches single-character localized searches', () => {
		expect(normalizeCatalogSearch(' 卡 ')).toBe('卡');
		expect(matchesCatalogSearch(['Kafra', '卡普拉职员'], '卡')).toBe(true);
	});

	it('clamps pagination to available pages', () => {
		expect(paginateCatalog([1, 2, 3], 9, 2)).toEqual({ page: 2, pageCount: 2, items: [3] });
	});

	it('renders a single current-map checkbox that defaults to checked', () => {
		const html = renderCatalogScopeFilter({ name: 'npc-scope' });
		expect(html).toContain('value="current" checked');
		expect(html).toContain('当前地图');
		expect(html).not.toContain('全世界');
		expect(renderCatalogScopeFilter({ name: 'npc-scope', value: 'all' })).not.toContain('checked');
	});

	it('labels catalog counts with the current-map or all-maps scope', () => {
		expect(catalogScopeLabel(true)).toBe('当前地图');
		expect(catalogScopeLabel(false)).toBe('全部地图');
		expect(formatCatalogCount(78, '个魔物', true)).toBe('共 78 个魔物（当前地图）');
		expect(formatCatalogCount(0, '个 NPC', false)).toBe('共 0 个 NPC（全部地图）');
	});
});
