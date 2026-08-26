import { describe, expect, it } from 'vitest';
import DB from '../../src/DB/DBManager.js';
import NpcNameTable from '../../src/DB/NpcNameTable.js';
import PronteraNpcNameTable from '../../src/DB/PronteraNpcNameTable.js';
import SecondStageNpcNameTable from '../../src/DB/SecondStageNpcNameTable.js';

describe('PronteraNpcNameTable', () => {
	it('localizes every registered visible name', () => {
		const entries = Object.entries(PronteraNpcNameTable);

		expect(entries).toHaveLength(487);
		for (const [source, translated] of entries) {
			expect(translated, source).toMatch(/[\u3400-\u9fff]/);
		}
	});

	it('contains the reported and representative NPC names', () => {
		expect(NpcNameTable['Eden Teleport Officer']).toBe('乐园团空间传送员');
		expect(NpcNameTable['King of Prontera']).toBe('普隆德拉国王');
		expect(NpcNameTable['Warmhearted woman']).toBe('热心女士');
		expect(NpcNameTable['Apprentice Craftsman']).toBe('工匠学徒');
		expect(NpcNameTable['Phantasmagorika Spokesp']).toBe('幻影机构发言人');
		expect(NpcNameTable.Arthail).toBe('阿尔泰尔');
		expect(NpcNameTable.Mage).toBe('魔法师');
		expect(NpcNameTable['New Guild Master']).toBe('新任公会会长');
		expect(NpcNameTable['Unknown Machine']).toBe('未知机器');
	});

	it('covers every name truncated by the 24-byte packet field', () => {
		for (const [source, translated] of Object.entries(PronteraNpcNameTable)) {
			if (/^[\u0020-\u007e]+$/.test(source) && source.length > 23) {
				expect(NpcNameTable[source.slice(0, 23)], source).toBe(translated);
			}
		}
	});

	it('preserves internal suffixes while localizing the visible name', () => {
		expect(DB.getNpcName('Eden Teleport Officer#1')).toBe('乐园团空间传送员#1');
		expect(DB.getNpcName('Maroll Battle Recruiter::BatRecruit1')).toBe(
			'马洛尔战斗招募员::BatRecruit1'
		);
		expect(DB.getNpcName('Unknown NPC#1')).toBe('Unknown NPC#1');
		expect(DB.getNpcName('Phantasmagorika Spokesp')).toBe('幻影机构发言人');
	});
});

describe('SecondStageNpcNameTable', () => {
	it('contains a Chinese translation for every audited name', () => {
		const entries = Object.entries(SecondStageNpcNameTable);

		expect(entries).toHaveLength(877);
		for (const [source, translated] of entries) {
			expect(translated, source).toMatch(/[\u3400-\u9fff]/);
		}
	});

	it('covers representative names from all eight towns', () => {
		expect(NpcNameTable['Bell Keeper']).toBe('钟楼管理员');
		expect(NpcNameTable['Juno Soldier']).toBe('朱诺士兵');
		expect(NpcNameTable['Comodo Guide']).toBe('科摩多向导');
		expect(NpcNameTable['High Priestess Niren']).toBe('大祭司妮伦');
		expect(NpcNameTable['Veins Guide']).toBe('维因斯向导');
		expect(NpcNameTable['Einbroch Smog Alert']).toBe('艾因布洛克烟雾警报器');
		expect(NpcNameTable['Rekenber Guard Oscar']).toBe('雷根贝勒守卫奥斯卡');
		expect(NpcNameTable['Monster Race Manager']).toBe('魔物竞速管理员');
	});

	it('covers every phase-two name truncated by the packet field', () => {
		for (const [source, translated] of Object.entries(SecondStageNpcNameTable)) {
			if (/^[\u0020-\u007e]+$/.test(source) && source.length > 23) {
				expect(NpcNameTable[source.slice(0, 23)], source).toBe(translated);
			}
		}
	});

	it('does not disguise an unaudited English name as translated', () => {
		expect(DB.getNpcName('Unaudited NPC')).toBe('Unaudited NPC');
	});
});
