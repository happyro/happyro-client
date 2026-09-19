import { describe, expect, it } from 'vitest';
import { ongoingQuestInfoAliases } from '../../src/DB/Quest/QuestResource.js';

describe('quest resource selection', () => {
	it('prefers the complete Episode quest table and retains the base fallback', () => {
		expect(ongoingQuestInfoAliases).toEqual([
			'System/OngoingQuestInfoList_True.lub',
			'System/OngoingQuestInfoList_True.lua',
			'System/OngoingQuestInfoList.lub',
			'System/OngoingQuestInfoList.lua'
		]);
	});
});
