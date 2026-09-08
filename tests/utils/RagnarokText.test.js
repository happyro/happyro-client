import { describe, expect, it } from 'vitest';
import { toPlainRagnarokText } from '../../src/Utils/RagnarokText.js';

describe('Ragnarok text', () => {
	it('removes inline color controls from plain UI text', () => {
		expect(toPlainRagnarokText('力量参数\\n ^cc0000近距离物理攻击力^ffffff,所持重量')).toBe(
			'力量参数\n 近距离物理攻击力,所持重量'
		);
		expect(toPlainRagnarokText('普通说明')).toBe('普通说明');
	});
});
