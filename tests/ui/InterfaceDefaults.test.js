import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import graphicsSource from '../../src/Preferences/Graphics.js?raw';
import introPreferencesSource from '../../src/UI/Components/Intro/Preferences.js?raw';

const apiSource = readFileSync(resolve(process.cwd(), 'applications/api/api.js'), 'utf8');
const builderSource = readFileSync(resolve(process.cwd(), 'applications/tools/builder-web.mjs'), 'utf8');
const charCreateV4Css = readFileSync(
	resolve(process.cwd(), 'src/UI/Components/CharCreate/CharCreatev4/CharCreatev4.css'),
	'utf8'
);
const charCreateV4Html = readFileSync(
	resolve(process.cwd(), 'src/UI/Components/CharCreate/CharCreatev4/CharCreatev4.html'),
	'utf8'
);
const inputBoxCss = readFileSync(resolve(process.cwd(), 'src/UI/Components/InputBox/InputBox.css'), 'utf8');

describe('interface defaults', () => {
	it('uses 1024x768 as the default and windowed fallback resolution', () => {
		expect(graphicsSource).toContain("screensize: '1024x768'");
		expect(introPreferencesSource).toContain("Graphics.screensize = '1024x768'");
		expect(apiSource).toContain("this.config.width = this.config.width || '1024'");
		expect(apiSource).toContain("this.config.height = this.config.height || '768'");
		expect(builderSource).toMatch(/var w = 1024, h = 768;/);
	});

	it('keeps the character creation cancel button inside the window', () => {
		expect(charCreateV4Css).toMatch(/#charcreate_v4 \.cancel \{[^}]*right: 15px;/s);
		expect(charCreateV4Html).toMatch(
			/class="btn cancel"\s+bg="make_character_ver2\/bt_close_normal\.bmp"/
		);
		expect(charCreateV4Html).not.toMatch(/class="btn cancel"\s+data-localized-label=/);
	});

	it('lowers the item quantity confirmation button', () => {
		expect(inputBoxCss).toMatch(/#inputbox ui-button \{[^}]*bottom: 5px;/s);
	});
});
