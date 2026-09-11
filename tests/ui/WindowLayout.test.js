import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const basicInfoSource = readFileSync(
	resolve(process.cwd(), 'src/UI/Components/BasicInfo/BasicInfoCommon.js'),
	'utf8'
);
const skillListCss = readFileSync(
	resolve(process.cwd(), 'src/UI/Components/SkillList/SkillListV2/SkillListV2.css'),
	'utf8'
);
const achievementSource = readFileSync(
	resolve(process.cwd(), 'src/UI/Components/Achievement/Achievement.js'),
	'utf8'
);
const achievementCss = readFileSync(
	resolve(process.cwd(), 'src/UI/Components/Achievement/Achievement.css'),
	'utf8'
);

describe('window layout', () => {
	it('keeps the top-left menu out of window snapping and stacking', () => {
		expect(basicInfoSource).toContain('Component.needFocus = false');
	});

	it('gives job-change skill tabs extra height and spacing', () => {
		expect(skillListCss).toMatch(/#SkillListV2 \.tab-label \{[\s\S]*min-height: 48px;/);
		expect(skillListCss).toMatch(/#SkillListV2 \.tab-label-mini \{[\s\S]*min-height: 38px;/);
		expect(skillListCss).toMatch(/#SkillListV2 \.tab-label \{[\s\S]*margin: 2px 0;/);
	});

	it('uses a flat selected color for achievement sidebar tabs', () => {
		expect(achievementSource).not.toContain('achievement_re/tab_press.bmp');
		expect(achievementSource).not.toContain('achievement_re/tab_out.bmp');
		expect(achievementCss).toContain('.sidebar .major-tab.active');
		expect(achievementCss).toContain('background: #eef3fb');
	});
});
