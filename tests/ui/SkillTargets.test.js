import { expect, it } from 'vitest';
import { canTargetSkill } from '../../src/UI/Game/SkillTargets.js';
const T = { TYPE_MOB: 1, TYPE_UNIT: 2, TYPE_TRAP: 3, TYPE_HOM: 4, TYPE_MERC: 5, TYPE_PC: 6, TYPE_ELEM: 7, TYPE_NPC: 8 };
const entity = type => ({ constructor: T, objecttype: type });
it('preserves category, shift/PvP override and enemy-self checks', () => {
	const mob = entity(T.TYPE_MOB),
		self = entity(T.TYPE_PC),
		player = entity(T.TYPE_PC),
		npc = entity(T.TYPE_NPC);
	expect(canTargetSkill(mob, 1)).toBe(true);
	expect(canTargetSkill(player, 16)).toBe(true);
	expect(canTargetSkill(player, 1)).toBe(false);
	expect(canTargetSkill(player, 1, { override: true })).toBe(true);
	expect(canTargetSkill(player, 1, { canAttack: () => true })).toBe(true);
	expect(canTargetSkill(self, 1, { self, override: true })).toBe(false);
	expect(canTargetSkill(npc, 1, { override: true })).toBe(false);
	expect(canTargetSkill(entity(T.TYPE_TRAP), 32)).toBe(true);
	expect(canTargetSkill(entity(T.TYPE_HOM), 16)).toBe(true);
});
