import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	canExecuteSkill,
	executeSkillUse,
	SKILL_INF,
	useSkillID
} from '../../src/UI/Components/SkillList/SkillUse.js';

describe('skill use gating', () => {
	it('does not reinterpret passive skills as self-cast', () => {
		const used = [];
		const targets = [];
		const skill = { SKID: 5014, level: 5, type: 0, selectedLevel: 5 };

		expect(canExecuteSkill(skill)).toBe(false);
		expect(
			executeSkillUse(skill, skill.selectedLevel, {
				onUseSkill: (id, level) => used.push({ id, level }),
				onSelectTarget: (target, inf) => targets.push({ target, inf })
			})
		).toBe(false);

		expect(used).toEqual([]);
		expect(targets).toEqual([]);
	});

	it('attempts use for a Self-inf skill', () => {
		const used = [];
		const skill = { SKID: 5014, level: 5, type: SKILL_INF.SELF };

		executeSkillUse(skill, undefined, {
			onUseSkill: (id, level) => used.push({ id, level })
		});

		expect(used).toEqual([{ id: 5014, level: 5 }]);
	});

	it('does not use an unlearned or missing skill', () => {
		const used = [];
		const onUseSkill = (id, level) => used.push({ id, level });

		expect(canExecuteSkill(null)).toBe(false);
		expect(executeSkillUse({ SKID: 5014, level: 0, type: SKILL_INF.SELF }, 5, { onUseSkill })).toBe(false);
		expect(used).toEqual([]);
	});

	it('opens target selection for attack skills', () => {
		const used = [];
		const targets = [];
		const skill = { SKID: 5, level: 10, type: SKILL_INF.ENEMY };

		executeSkillUse(skill, 10, {
			onUseSkill: (id, level) => used.push({ id, level }),
			onSelectTarget: (target, inf) => targets.push({ id: target.SKID, inf })
		});

		expect(used).toEqual([]);
		expect(targets).toEqual([{ id: 5, inf: SKILL_INF.ENEMY }]);
	});

	it('useSkillID fires Full Throttle with the server self-cast type', () => {
		const used = [];
		const skills = {
			5014: { SKID: 5014, level: 5, type: 4, selectedLevel: 5 }
		};

		expect(
			useSkillID(id => skills[id], 5014, undefined, {
				onUseSkill: (id, level) => used.push({ id, level })
			})
		).toBe(true);
		expect(used).toEqual([{ id: 5014, level: 5 }]);
	});

	it('useSkillID does not fire when the skill is missing from the list', () => {
		const used = [];
		expect(
			useSkillID(() => null, 5014, 5, {
				onUseSkill: (id, level) => used.push({ id, level })
			})
		).toBe(false);
		expect(used).toEqual([]);
	});

	it('wires SkillList and Guild useSkillID through the shared gate', () => {
		const src = resolve(dirname(fileURLToPath(import.meta.url)), '../../src');
		const skillList = readFileSync(resolve(src, 'UI/Components/SkillList/SkillListCommon.js'), 'utf8');
		const guild = readFileSync(resolve(src, 'UI/Components/Guild/Guild.js'), 'utf8');
		const shortcut = readFileSync(resolve(src, 'UI/Components/ShortCut/ShortCut.js'), 'utf8');

		expect(skillList).toContain("from './SkillUse.js'");
		expect(skillList).toContain('useSkillID(getSkillById, id, level');
		expect(guild).toContain("from 'UI/Components/SkillList/SkillUse.js'");
		expect(guild).toContain('useSkillID(getSkillById, id, level');
		expect(shortcut).toContain('SkillWindow.getUI().useSkillID(id, level)');
	});
});
