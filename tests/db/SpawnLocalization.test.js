import { describe, expect, it } from 'vitest';
import MapTable from '../../src/DB/Map/MapTable.js';
import MiniMapTable from '../../src/DB/Map/MiniMapTable.js';
import MonsterTable from '../../src/DB/Monsters/MonsterTable.js';

describe('spawn localization', () => {
	it('localizes the remote island map', () => {
		for (const map of ['int_land.rsw', 'int_land01.rsw', 'int_land02.rsw', 'int_land03.rsw', 'int_land04.rsw']) {
			expect(MapTable[map].signName.mainTitle).toBe('偏远岛屿');
			expect(MapTable[map].displayName).toBe('偏远岛屿');
		}
	});

	it('localizes summoner job names', () => {
		expect(MonsterTable[4218]).toBe('召唤师');
		expect(MonsterTable[4220]).toBe('召唤师宝宝');
	});

	it('uses the Alberta island minimap for every remote island instance', () => {
		for (const map of ['int_land', 'int_land01', 'int_land02', 'int_land03', 'int_land04']) {
			expect(MiniMapTable[map]).toBe('alb2trea');
		}
	});
});
