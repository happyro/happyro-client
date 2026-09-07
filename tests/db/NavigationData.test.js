import { describe, expect, it } from 'vitest';
import {
	replaceNavigationRows,
	searchNavigationMaps,
	searchNavigationRows
} from '../../src/DB/Navigation/NavigationData.js';
import { localizeNavigationNpcName } from '../../src/DB/Navigation/NavigationNameLocalization.js';

const localizers = {
	npc: name => ({ Kafra: '卡普拉职员' })[name] || name,
	npcAliases: name => (name === '카프라' ? ['Kafra'] : []),
	mob: (id, fallback) => ({ 1002: '波利' })[id] || fallback,
	map: map => ({ prontera: '普隆德拉' })[map] || map
};

describe('navigation data', () => {
	it('replaces sequential Lua rows without losing array length', () => {
		const target = [['stale']];
		replaceNavigationRows(target, [['first'], ['second']]);

		expect(target).toEqual([['first'], ['second']]);
		expect(target).toHaveLength(2);
	});

	it('orders numeric keys when Lua extraction returns an object', () => {
		const target = [];
		replaceNavigationRows(target, { 2: ['second'], 1: ['first'] });

		expect(target).toEqual([['first'], ['second']]);
	});

	it('searches and displays localized NPC names', () => {
		const rows = [['prontera', 10, 100, 4, 'Kafra', '', 146, 89]];
		const results = searchNavigationRows(rows, [], '卡普拉', 'NPC', localizers);

		expect(results).toEqual([
			{
				type: 'NPC',
				id: 10,
				name: '卡普拉职员',
				mapName: 'prontera',
				mapDisplayName: '普隆德拉',
				x: 146,
				y: 89
			}
		]);
	});

	it('keeps resource names searchable and unpacks monster ids', () => {
		const packedMobId = (12 << 16) | 1002;
		const rows = [['prontera', 20, 300, packedMobId, 'PORING', 'PORING', 1, 0]];
		const results = searchNavigationRows([], rows, 'poring', 'MOB', localizers);

		expect(results[0]).toMatchObject({
			id: 1002,
			name: '波利',
			mapDisplayName: '普隆德拉',
			x: null,
			y: null
		});
	});

	it('matches navigation-only NPC aliases', () => {
		const rows = [['prontera', 10, 100, 4, '카프라', '', 146, 89]];

		expect(searchNavigationRows(rows, [], 'Kafra', 'NPC', localizers)).toHaveLength(1);
	});

	it('matches monster sprite names', () => {
		const rows = [['prontera', 20, 300, 1002, '포링', 'PORING', 1, 0]];

		expect(searchNavigationRows([], rows, 'PORING', 'MOB', localizers)).toHaveLength(1);
	});

	it('searches maps by localized name or resource id without duplicates', () => {
		const worlds = [
			{ maps: [{ id: 'prontera', name: '普隆德拉' }, { id: 'prt_fild08', name: '普隆德拉原野 08' }] },
			{ maps: [{ id: 'prontera', name: '普隆德拉' }] }
		];

		const mapInfo = { 'prt_maze01.rsw': { displayName: '普隆德拉迷宫 1F' } };
		const localizedResults = searchNavigationMaps(worlds, mapInfo, '普隆德拉', 'MAP', id => id);
		expect(localizedResults).toHaveLength(3);
		expect(localizedResults[0]).toMatchObject({ id: 'prontera', name: '普隆德拉' });
		expect(searchNavigationMaps(worlds, mapInfo, 'prt_fild08', 'MAP', id => id)[0]).toMatchObject({
			type: 'MAP',
			mapName: 'prt_fild08',
			name: '普隆德拉原野 08',
			x: null,
			y: null
		});
		expect(searchNavigationMaps(worlds, mapInfo, '普隆德拉', 'NPC', id => id)).toEqual([]);
	});

	it('hides novice map channel replicas by default', () => {
		const mapInfo = Object.fromEntries(
			['prt_fild08', 'prt_fild08a', 'prt_fild08b', 'prt_fild08c', 'prt_fild08d'].map(id => [
				`${id}.rsw`,
				{ displayName: '普隆德拉南门' }
			])
		);

		const results = searchNavigationMaps([], mapInfo, '普隆德拉南门', 'MAP', id => id);

		expect(results).toEqual([
			expect.objectContaining({ id: 'prt_fild08', name: '普隆德拉南门' })
		]);
	});

	it('labels every novice map channel when channels are enabled', () => {
		const mapInfo = Object.fromEntries(
			['prt_fild08', 'prt_fild08a', 'prt_fild08b', 'prt_fild08c', 'prt_fild08d'].map(id => [
				`${id}.rsw`,
				{ displayName: '普隆德拉南门' }
			])
		);

		const results = searchNavigationMaps([], mapInfo, '普隆德拉南门', 'MAP', id => id, true);

		expect(results.map(result => [result.id, result.name])).toEqual([
			['prt_fild08', '普隆德拉南门 · 频道 1'],
			['prt_fild08a', '普隆德拉南门 · 频道 2'],
			['prt_fild08b', '普隆德拉南门 · 频道 3'],
			['prt_fild08c', '普隆德拉南门 · 频道 4'],
			['prt_fild08d', '普隆德拉南门 · 频道 5']
		]);
	});

	it('filters and labels NPC results using the same channel policy', () => {
		const rows = [
			['izlude', 10, 100, 4, 'Kafra', '', 146, 89],
			['izlude_a', 11, 101, 4, 'Kafra', '', 146, 89]
		];
		const channelLocalizers = { ...localizers, map: () => '伊斯鲁得' };

		expect(searchNavigationRows(rows, [], '卡普拉', 'NPC', channelLocalizers)).toHaveLength(1);
		expect(searchNavigationRows(rows, [], '卡普拉', 'NPC', channelLocalizers, true)).toEqual([
			expect.objectContaining({ mapName: 'izlude', mapDisplayName: '伊斯鲁得 · 频道 1' }),
			expect.objectContaining({ mapName: 'izlude_a', mapDisplayName: '伊斯鲁得 · 频道 2' })
		]);
	});

	it('does not translate Korean terms embedded in unrelated NPC names', () => {
		expect(localizeNavigationNpcName('드워프 대장장이')).toBe('드워프 대장장이');
		expect(localizeNavigationNpcName('카프라 워프')).toBe('卡普拉 传送员');
	});
});
