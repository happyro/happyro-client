import { describe, expect, it } from 'vitest';
import { localizeGuildPositionName } from '../../src/DB/GuildPositionName.js';

describe('localizeGuildPositionName', () => {
	it('translates default guild ranks', () => {
		expect(localizeGuildPositionName('GuildMaster')).toBe('会长');
		expect(localizeGuildPositionName('Position 1')).toBe('职位 1');
		expect(localizeGuildPositionName('Position 2')).toBe('职位 2');
		expect(localizeGuildPositionName('Newbie')).toBe('新成员');
	});

	it('keeps custom ranks unchanged', () => {
		expect(localizeGuildPositionName('副会长')).toBe('副会长');
		expect(localizeGuildPositionName('')).toBe('');
	});
});
