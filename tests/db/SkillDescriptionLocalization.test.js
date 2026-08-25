import { describe, expect, it } from 'vitest';
import {
	buildChineseSkillFallback,
	localizeSkillDescriptions
} from '../../src/DB/Skills/SkillDescriptionLocalization.js';

describe('SkillDescriptionLocalization', () => {
	it('replaces Korean descriptions with a Chinese mechanical summary', () => {
		const descriptions = { 1: '기본 기능을 사용할 수 있다.' };
		const skillInfo = {
			1: { MaxLv: 2, SpAmount: [3, 5], AttackRange: [1, 1] }
		};

		expect(localizeSkillDescriptions(descriptions, skillInfo)[1]).toBe(
			'该技能的简体中文详细说明尚未收录。\n最高等级：2\nSP 消耗：3 / 5\n施放范围：1'
		);
	});

	it('keeps descriptions that are already localized', () => {
		const descriptions = { 1: '完整中文说明' };
		expect(localizeSkillDescriptions(descriptions, {})[1]).toBe('完整中文说明');
	});

	it('handles skills without mechanical metadata', () => {
		expect(buildChineseSkillFallback()).toBe('该技能的简体中文详细说明尚未收录。');
	});
});
