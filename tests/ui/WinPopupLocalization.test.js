import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import popupHtml from '../../src/UI/Components/WinPopup/WinPopup.html?raw';

const popupCss = readFileSync(resolve('src/UI/Components/WinPopup/WinPopup.css'), 'utf8');

describe('WinPopup localization', () => {
	it('covers the Korean bitmap title with a Chinese title bar', () => {
		expect(popupHtml).toContain('<div class="titlebar">提示</div>');
		expect(popupCss).toContain('#win_popup .titlebar');
		expect(popupCss).toContain('z-index: 1');
	});
});
