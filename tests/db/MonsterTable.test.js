import { describe, expect, it } from 'vitest';
import MonsterTable from '../../src/DB/Monsters/MonsterTable.js';

describe('monster sprite table', () => {
	it('maps the Poring Village monsters to official sprites', () => {
		expect(MonsterTable[3810]).toBe('KING_PORING');
		expect(MonsterTable[3811]).toBe('GOLDPORING');
		expect(MonsterTable[3812]).toBe('PORING');
		expect(MonsterTable[3813]).toBe('DROPS');
		expect(MonsterTable[3814]).toBe('POPORING');
		expect(MonsterTable[3815]).toBe('PORING');
		expect(MonsterTable[3816]).toBe('MARIN');
	});

	it('keeps official sprite mappings for newer monster ranges', () => {
		expect(MonsterTable[3190]).toBe('MM_SARAH');
		expect(MonsterTable[20255]).toBe('teddy_bear_r');
		expect(MonsterTable[20843]).toBe('ILL_ABYSMAL_WITCH');
	});
});
