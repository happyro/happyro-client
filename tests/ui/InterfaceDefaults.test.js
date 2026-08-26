import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import graphicsSource from '../../src/Preferences/Graphics.js?raw';
import introPreferencesSource from '../../src/UI/Components/Intro/Preferences.js?raw';

const charCreateV4Css = readFileSync(
	resolve(process.cwd(), 'src/UI/Components/CharCreate/CharCreatev4/CharCreatev4.css'),
	'utf8'
);

describe('interface defaults', () => {
	it('uses 1024x768 as the default and windowed fallback resolution', () => {
		expect(graphicsSource).toContain("screensize: '1024x768'");
		expect(introPreferencesSource).toContain("Graphics.screensize = '1024x768'");
	});

	it('keeps the character creation cancel button inside the window', () => {
		expect(charCreateV4Css).toMatch(/#charcreate_v4 \.cancel \{[^}]*right: 5px;/s);
	});
});
