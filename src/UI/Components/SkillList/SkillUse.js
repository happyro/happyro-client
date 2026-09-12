/**
 * Decide whether a learned skill can be executed from the skill window or shortcut.
 *
 * Packet `type` is authoritative rAthena inf; zero denotes a passive skill.
 */

import { remainingCooldown } from 'Network/SkillCooldowns.js';

export const SKILL_INF = {
	PASSIVE: 0,
	ENEMY: 1,
	PLACE: 2,
	SELF: 4,
	FRIEND: 16,
	TRAP: 32
};

SKILL_INF.TARGET = SKILL_INF.ENEMY | SKILL_INF.PLACE | SKILL_INF.FRIEND | SKILL_INF.TRAP;

export function canExecuteSkill(skill) {
	return Boolean(skill && skill.level > 0 && Number.isInteger(skill.type) && (skill.type & (SKILL_INF.SELF | SKILL_INF.TARGET)));
}

export function skillInf(skill) {
	return skill?.type || 0;
}

export function executeSkillUse(skill, level, { onUseSkill, onSelectTarget } = {}) {
	if (!canExecuteSkill(skill)) {
		return false;
	}
	const remaining = remainingCooldown(skill.SKID);
	if (remaining > 0) {
		import('UI/Components/ChatBox/ChatBox.js').then(({ default: ChatBox }) => {
			ChatBox.addText(`技能冷却中，剩余 ${Math.ceil(remaining / 1000)} 秒`, ChatBox.TYPE.ERROR, ChatBox.FILTER.SKILL_FAIL);
		});
		return false;
	}

	const inf = skillInf(skill);
	const useLevel = level ? level : skill.level;

	if (inf & SKILL_INF.SELF) {
		onUseSkill?.(skill.SKID, useLevel);
	}

	skill.useLevel = useLevel;

	if (inf & SKILL_INF.TARGET) {
		onSelectTarget?.(skill, inf);
	}

	return true;
}

export function useSkillID(getSkillById, id, level, hooks) {
	const skill = getSkillById(id);
	if (!canExecuteSkill(skill)) {
		return false;
	}
	return executeSkillUse(skill, level ? level : skill.selectedLevel, hooks);
}
