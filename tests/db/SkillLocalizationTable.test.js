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
		expect(SkillLocalizationTable[12].description).toContain(
			'习得条件：圣灵召唤 Lv.7、灵魂打击 Lv.5；或光耀之堂 Lv.3、圣水洗礼 Lv.4'
		);
		expect(SkillLocalizationTable[143].description).toContain('习得条件：完成任务，且仅限初心者');
		expect(SkillLocalizationTable[317].description).toContain('类型：演奏技能');
		expect(SkillLocalizationTable[2425].description).toContain('目标：敌对玩家');
		expect(SkillLocalizationTable[5210].description).toContain('消耗 150 AP');
		expect(SkillLocalizationTable[5201].description).toContain('每级恢复“技能等级 × 6”AP');
		expect(SkillLocalizationTable[82].description).toContain('最高等级：1');
		expect(SkillLocalizationTable[404].description).toContain('最高等级：1');
		expect(SkillLocalizationTable[2564].description).toContain('最高等级：1');
		expect(SkillLocalizationTable[129].description).toContain('苍鹰之眼射程再加 3 格');
		expect(SkillLocalizationTable[131].description).toContain('习得条件：猎鹰精通、拆除陷阱 Lv.1');
		expect(SkillLocalizationTable[387].description).toContain('手推车革命、更换手推车');
		expect(SkillLocalizationTable[444].description).toContain('且处于灵魂状态');
		expect(SkillLocalizationTable[3036].description).toContain('范围：自身周围 7 格');
		expect(SkillLocalizationTable[5452].description).toContain('伤害受战斗自学');
	});

	it('contains Chinese names and descriptions without Korean text', () => {
		for (const entry of Object.values(SkillLocalizationTable)) {
			expect(entry.name).toMatch(/[\u3400-\u9fff]/);
			expect(entry.description).toMatch(/[\u3400-\u9fff]/);
			expect(entry.name).not.toMatch(HANGUL);
			expect(entry.description).not.toMatch(HANGUL);
			expect(entry.description).not.toContain('undefined');
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
