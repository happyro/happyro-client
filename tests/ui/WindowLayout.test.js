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
const npcStoreCss = readFileSync(
	resolve(process.cwd(), 'src/UI/Components/NpcStore/NpcStore.css'),
	'utf8'
);
const bankCss = readFileSync(resolve(process.cwd(), 'src/UI/Components/Bank/Bank.css'), 'utf8');
const winLoginCss = readFileSync(
	resolve(process.cwd(), 'src/UI/Components/WinLogin/WinLogin/WinLogin.css'),
	'utf8'
);
const winLoginV2Css = readFileSync(
	resolve(process.cwd(), 'src/UI/Components/WinLogin/WinLoginV2/WinLoginV2.css'),
	'utf8'
);
const winPopupCss = readFileSync(
	resolve(process.cwd(), 'src/UI/Components/WinPopup/WinPopup.css'),
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

	it('keeps NPC store buy and cancel buttons 2px apart', () => {
		expect(npcStoreCss).toMatch(/#NpcStore \.OutputWindow \.btn\.buy \{\s*right: 59px;/);
		expect(npcStoreCss).toMatch(/#NpcStore \.btn\.cancel \{\s*position: absolute;\s*top: 4px;\s*right: 15px;/);
	});

	it('lets bank amount buttons grow with their labels', () => {
		expect(bankCss).toContain('#Bank .tenmil');
		expect(bankCss).toContain('width: auto');
		expect(bankCss).toContain('white-space: nowrap');
		expect(bankCss).not.toMatch(/#Bank \.tenmil \{[\s\S]*width: 62px;/);
	});

	it('places the login remember control on the left', () => {
		expect(winLoginCss).toMatch(/#WinLogin \.save \{[\s\S]*left: 8px;/);
		expect(winLoginCss).not.toMatch(/#WinLogin \.save \{[\s\S]*right: 4px;/);
		expect(winLoginV2Css).toMatch(/#WinLogin \.win_login \.save \{[\s\S]*left: 17px;/);
	});

	it('raises prompt buttons by 1px', () => {
		expect(winPopupCss).toMatch(/#win_popup \.btns \{[\s\S]*bottom: 3px;/);
	});
});
