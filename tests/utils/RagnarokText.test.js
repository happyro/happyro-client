import { describe, expect, it } from 'vitest';
import { formatRagnarokMarkup, toPlainRagnarokText } from '../../src/Utils/RagnarokText.js';

describe('Ragnarok text', () => {
	it('removes inline color controls from plain UI text', () => {
		expect(toPlainRagnarokText('力量参数\\n ^cc0000近距离物理攻击力^ffffff,所持重量')).toBe(
			'力量参数\n 近距离物理攻击力,所持重量'
		);
		expect(toPlainRagnarokText('普通说明')).toBe('普通说明');
	});

	it('keeps NAVI display names and hides navigation markup', () => {
		const source =
			'^ffffff<NAVI>^4D4DFF[海达姆伙伴]^000000<INFO>mal_in01,20,124,0,100,0,0</INFO></NAVI>^000000';
		expect(toPlainRagnarokText(source)).toBe('[海达姆伙伴]');
		expect(formatRagnarokMarkup(source)).toContain('class="navi-link"');
		expect(formatRagnarokMarkup(source)).toContain('data-navi-info="mal_in01,20,124,0,100,0,0"');
		expect(formatRagnarokMarkup(source)).toContain('data-navi-name="[海达姆伙伴]"');
		expect(formatRagnarokMarkup(source)).not.toContain('&lt;NAVI&gt;');
		expect(formatRagnarokMarkup(source)).not.toContain('<INFO>');
	});
});
