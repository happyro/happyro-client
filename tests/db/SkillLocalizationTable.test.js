import { describe, expect, it } from 'vitest';
import SkillLocalizationTable from '../../src/DB/Skills/SkillLocalizationTable.generated.js';

const HANGUL = /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/;

describe('SkillLocalizationTable', () => {
	it('contains the complete generated skill catalog', () => {
		expect(Object.keys(SkillLocalizationTable)).toHaveLength(1635);
		expect(SkillLocalizationTable[5]).toMatchObject({ key: 'SM_BASH', name: '狂击' });
		expect(SkillLocalizationTable[6].description).toContain('最高等级：10');
	});

	it('contains Chinese names and descriptions without Korean text', () => {
		for (const entry of Object.values(SkillLocalizationTable)) {
			expect(entry.name).toMatch(/[\u3400-\u9fff]/);
			expect(entry.description).toMatch(/[\u3400-\u9fff]/);
			expect(entry.name).not.toMatch(HANGUL);
			expect(entry.description).not.toMatch(HANGUL);
		}
	});
});
