import { describe, expect, it } from 'vitest';
import SkillInfo from '../../src/DB/Skills/SkillInfo.generated.js';
import SkillLocalizationTable from '../../src/DB/Skills/SkillLocalizationTable.generated.js';
import SkillTreeView from '../../src/DB/Skills/SkillTreeView.generated.js';

const HANGUL = /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/;

describe('SkillLocalizationTable', () => {
	it('contains the complete generated skill catalog', () => {
		expect(Object.keys(SkillLocalizationTable)).toHaveLength(1767);
		expect(SkillLocalizationTable[5]).toMatchObject({ key: 'SM_BASH', name: '狂击' });
		expect(SkillLocalizationTable[6].description).toContain('降低玩家目标的 VIT 防御力');
		expect(SkillLocalizationTable[5201].description).toContain('操纵最多 5 个');
		expect(SkillLocalizationTable[8001].description).toContain('红色纤细药水');
		expect(SkillLocalizationTable[10019].description).toContain('攻城模式');
		expect(SkillLocalizationTable[559]).toMatchObject({
			key: 'MB_MUNAKKNOWLEDGE',
			name: '驯养大师'
		});
		expect(SkillLocalizationTable[487].description).toContain('合奏期间可以自由移动');
	});

	it('contains Chinese names and descriptions without Korean text', () => {
		for (const entry of Object.values(SkillLocalizationTable)) {
			expect(entry.name).toMatch(/[\u3400-\u9fff]/);
			expect(entry.description).toMatch(/[\u3400-\u9fff]/);
			expect(entry.name).not.toMatch(HANGUL);
			expect(entry.description).not.toMatch(HANGUL);
			expect(entry.description).not.toMatch(/官方技能效果数据已收录|尚未收录|相关技能效果/);
		}
	});

	it('contains the complete static runtime definitions and job trees', () => {
		expect(Object.keys(SkillInfo)).toHaveLength(1572);
		expect(Object.keys(SkillTreeView)).toHaveLength(251);
		expect(SkillInfo[5]).toMatchObject({
			Name: 'SM_BASH',
			SkillName: '狂击',
			MaxLv: 10,
			SpAmount: [8, 8, 8, 8, 8, 15, 15, 15, 15, 15],
			AttackRange: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
		});
		expect(SkillTreeView[1]).toMatchObject({ list: 1, beforeJob: 0, 5: 3 });
		for (const skill of Object.values(SkillInfo)) {
			expect(skill.SkillName).toMatch(/[\u3400-\u9fff]/);
			expect(skill.SkillName).not.toMatch(HANGUL);
		}
	});
});
