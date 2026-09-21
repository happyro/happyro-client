import SkillId from 'DB/Skills/SkillConst.js';

const targetAttackSkills = new Set([
	SkillId.HT_BLITZBEAT,
	SkillId.SN_FALCONASSAULT,
	SkillId.WH_HAWKRUSH,
	SkillId.WH_HAWKBOOMERANG,
	SkillId.WH_WILD_WALK
]);

export function isFalconTargetAttackSkill(skillId) {
	return targetAttackSkills.has(skillId);
}
