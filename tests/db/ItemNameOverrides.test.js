import { describe, expect, it } from 'vitest';
import ItemNameOverrides from '../../src/DB/Items/ItemNameOverrides.generated.js';

describe('ItemNameOverrides', () => {
	it('covers every runtime item name without Korean text', () => {
		expect(Object.keys(ItemNameOverrides)).toHaveLength(29356);
		expect(Object.values(ItemNameOverrides).every(name => !/[\uac00-\ud7af]/.test(name))).toBe(true);
		expect(ItemNameOverrides[1101]).toBe('剑');
	});

	it('provides Chinese card names for equipment name affixes', () => {
		expect(ItemNameOverrides[4006]).toBe('疯兔卡片');
		expect(ItemNameOverrides[4002]).toBe('绿棉虫卡片');
	});
});
