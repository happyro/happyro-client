/* Archived with the itemlocalization overlay; itemInfo_true.lub is tested by
the client database loading tests instead.
import { describe, expect, it } from 'vitest';
import { applyItemLocalization } from '../../src/DB/Items/ItemLocalization.js';

describe('ItemLocalization', () => {
	it('overrides only player-visible item text', () => {
		const itemTable = {
			501: {
				identifiedDisplayName: '빨간포션',
				identifiedResourceName: '빨간포션',
				ClassNum: 0
			}
		};

		const count = applyItemLocalization(itemTable, {
			501: ['红色药水', '红色药水', ['未鉴定说明'], ['恢复 HP。']]
		});

		expect(count).toBe(1);
		expect(itemTable[501]).toEqual({
			unidentifiedDisplayName: '红色药水',
			identifiedDisplayName: '红色药水',
			unidentifiedDescriptionName: ['未鉴定说明'],
			identifiedDescriptionName: ['恢复 HP。'],
			identifiedResourceName: '빨간포션',
			ClassNum: 0
		});
	});

	it('ignores localized IDs that are absent from the loaded item table', () => {
		expect(applyItemLocalization({}, { 501: ['红色药水', '红色药水', [], []] })).toBe(0);
	});

	it('rejects malformed localization entries', () => {
		expect(() => applyItemLocalization({ 501: {} }, { 501: ['红色药水'] })).toThrow(
			'Invalid item localization entry: 501'
		);
	});
});
*/

import { describe } from 'vitest';

describe.skip('ItemLocalization (archived)', () => {});
