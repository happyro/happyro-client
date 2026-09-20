import { describe, expect, it } from 'vitest';
import SK from '../../src/DB/Skills/SkillConst.js';
import { isFalconTargetAttackSkill } from '../../src/Engine/MapEngine/FalconSkillMotion.js';

describe('falcon target attack movement', () => {
	it('covers hunter and fourth-job windhawk attacks', () => {
		for (const skill of [SK.HT_BLITZBEAT, SK.SN_FALCONASSAULT, SK.WH_HAWKRUSH, SK.WH_HAWKBOOMERANG]) {
			expect(isFalconTargetAttackSkill(skill)).toBe(true);
		}
	});

	it('does not move the falcon for unrelated skills', () => {
		expect(isFalconTargetAttackSkill(SK.WH_HAWK_M)).toBe(false);
	});
});
