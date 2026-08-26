import { describe, expect, it } from 'vitest';
import { normalizeROFontSizes } from '../../src/UI/NpcTextFormatting.js';

describe('normalizeROFontSizes', () => {
	it.each([
		['<FONT SIZE = 14>注意</FONT>', '<font style="font-size:14px">注意</FONT>'],
		['<font size="16"><b>等一下</b></font>', '<font style="font-size:16px"><b>等一下</b></font>'],
		["<font color='DF0101' size='10'>警告</font>", "<font color='DF0101' style=\"font-size:10px\">警告</font>"]
	])('converts RO font sizes to CSS pixels', (input, output) => {
		expect(normalizeROFontSizes(input)).toBe(output);
	});

	it('preserves font tags without a size', () => {
		expect(normalizeROFontSizes('<FONT COLOR = E68F8F>文本</FONT>')).toBe('<FONT COLOR = E68F8F>文本</FONT>');
	});
});
