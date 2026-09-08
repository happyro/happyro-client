import { describe, expect, it } from 'vitest';
import SupportedMapTable, { isSupportedMapResource } from '../../src/DB/Map/SupportedMapTable.js';

describe('supported map resources', () => {
	it('contains only the verified client and server intersection', () => {
		expect(SupportedMapTable.size).toBe(891);
		expect(isSupportedMapResource('prontera.gat')).toBe(true);
		expect(isSupportedMapResource('jor_tail')).toBe(false);
		expect(isSupportedMapResource('airplane_01.rsw')).toBe(false);
	});
});
