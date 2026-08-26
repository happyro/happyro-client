import { describe, expect, it } from 'vitest';
import SC from '../../src/DB/Status/StatusConst.js';
import StatusInfo from '../../src/DB/Status/StatusInfo.js';
import {
	restoreLocalizedStatusDescription,
	snapshotLocalizedStatusDescriptions
} from '../../src/DB/Status/StatusDescriptionLocalization.js';

describe('status description localization', () => {
	it('contains Chinese descriptions for the novice spawn buffs', () => {
		expect(StatusInfo[SC.BLESSING].descript[0][0]).toBe('天使之赐福');
		expect(StatusInfo[SC.INC_AGI].descript[0][0]).toBe('敏捷提升');
	});

	it('restores localized descriptions after official status metadata loads', () => {
		const statusInfo = {
			10: { descript: [['中文名称', '#fff'], ['中文说明']] },
			99: {}
		};
		const descriptions = snapshotLocalizedStatusDescriptions(statusInfo);

		statusInfo[10].descript = [['한국어']];
		expect(restoreLocalizedStatusDescription(statusInfo, descriptions, 10)).toBe(true);
		expect(statusInfo[10].descript).toEqual([['中文名称', '#fff'], ['中文说明']]);

		expect(restoreLocalizedStatusDescription(statusInfo, descriptions, 99)).toBe(false);
		expect(statusInfo[99].descript).toEqual([]);
	});
});
