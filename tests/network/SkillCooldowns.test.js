import { afterEach, expect, it, vi } from 'vitest';
import { remainingCooldown, setSkillCooldown, setGlobalCooldown, clearCooldowns } from '../../src/Network/SkillCooldowns.js';
import { endConnection } from '../../src/Network/ConnectionLifecycle.js';
import { executeSkillUse } from '../../src/UI/Components/SkillList/SkillUse.js';
vi.mock('../../src/UI/Components/ChatBox/ChatBox.js', () => ({ default: { addText: vi.fn(), TYPE: { ERROR: 1 }, FILTER: { SKILL_FAIL: 1 } } }));
afterEach(clearCooldowns);
it('retains server cooldowns before shortcuts exist and shares them across slots', () => {
	setSkillCooldown(5014, 3000000, 1000);
	expect(remainingCooldown(5014, 2000)).toBe(2999000);
	expect(remainingCooldown(8, 2000)).toBe(0);
	setGlobalCooldown(500, 2000);
	expect(remainingCooldown(5014, 2100)).toBe(2998900);
	expect(remainingCooldown(8, 2100)).toBe(400);
});
it('accepts authoritative shortening and reset without clearing unrelated skills', () => {
	setSkillCooldown(5014, 5000, 0);
	setSkillCooldown(8, 2000, 0);
	setSkillCooldown(5014, 100, 1000);
	expect(remainingCooldown(5014, 1050)).toBe(50);
	setSkillCooldown(5014, 0, 1050);
	expect(remainingCooldown(5014, 1050)).toBe(0);
	expect(remainingCooldown(8, 1050)).toBe(950);
});
it('clears all cooldowns when the character connection ends', () => {
	setSkillCooldown(5014, 5000, 0);setGlobalCooldown(2000, 0);
	endConnection();expect(remainingCooldown(5014, 0)).toBe(0);
});
it('blocks both skill use paths while cooling down and permits use after reset', () => {
	const onUseSkill = vi.fn(); const skill = { SKID: 5014, level: 5, type: 4 };
	setSkillCooldown(5014, 10000);
	expect(executeSkillUse(skill, 5, {onUseSkill})).toBe(false);
	expect(onUseSkill).not.toHaveBeenCalled();
	setSkillCooldown(5014, 0);
	expect(executeSkillUse(skill, 5, {onUseSkill})).toBe(true);
	expect(onUseSkill).toHaveBeenCalledWith(5014, 5);
});
