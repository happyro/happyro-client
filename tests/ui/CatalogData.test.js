import { describe, expect, it } from 'vitest';
import { matchesCatalogSearch, normalizeCatalogSearch, paginateCatalog } from '../../src/UI/Components/GameTools/CatalogData.js';

describe('catalog data', () => {
	it('normalizes and matches single-character localized searches', () => {
		expect(normalizeCatalogSearch(' 卡 ')).toBe('卡');
		expect(matchesCatalogSearch(['Kafra', '卡普拉职员'], '卡')).toBe(true);
	});

	it('clamps pagination to available pages', () => {
		expect(paginateCatalog([1, 2, 3], 9, 2)).toEqual({ page: 2, pageCount: 2, items: [3] });
	});
});
