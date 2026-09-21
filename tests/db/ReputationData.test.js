import { runInNewContext } from 'node:vm';
import { deserialize, serialize } from 'bson';
import { describe, expect, it, vi } from 'vitest';
import source from '../../src/DB/DBManager.js?raw';
import { localizeReputation, reputationGroupNames, reputationNames } from '../../src/DB/Reputation/ReputationLocalization.js';

const loader = source.slice(source.indexOf('function loadBSONFile('), source.indexOf('\n/**', source.indexOf('function loadBSONFile(')));
const registration = source.slice(source.indexOf('// Reputation:'), source.indexOf('Network.hookPacket(PACKET.ZC.ACK_REQNAME_BYGID'));

function load(version) {
	const pending = [];
	const onEnd = vi.fn();
	const context = {
		localizeReputation, reputationGroupNames, reputationNames,
		PACKETVER: { value: version }, ReputeGroup: {}, ReputeInfo: {}, BSON: { deserialize },
		console: { log: vi.fn(), error: vi.fn() },
		onLoad: vi.fn(() => onEnd),
		Client: { loadFile: (path, done) => pending.push({ path, done }) }
	};
	runInNewContext(loader + registration, context);
	return { context, pending, onEnd };
}

describe('reputation resources', () => {
	it.each([20211103, 20211118, 20220330])('loads and awaits both tables for supported protocol %i', version => {
		const { context, pending, onEnd } = load(version);
		expect(pending).toHaveLength(2);
		expect(context.onLoad).toHaveBeenCalledTimes(2);
		expect(onEnd).not.toHaveBeenCalled();
		pending[0].done(serialize({ '// official group comment': 0, ReputeGroup: { 1: { Name: '마물 친구들', ReputeList: [1, 2] }, 2: { Name: '아루나펠츠', ReputeList: [3] } } }));
		pending[1].done(serialize({ '// official reputation comment': 0, reputeInfo: { 1: { Name: '오크 부락', Invisible: 'VISIBLE_TRUE' }, 2: { Name: '고블린 부락', Invisible: 'VISIBLE_TRUE' }, 3: { Name: '회색늑대 마을', Invisible: 'VISIBLE_EXIST' } } }));
		expect(Object.keys(context.ReputeGroup)).toEqual(['1', '2']);
		expect(Object.keys(context.ReputeInfo)).toEqual(['1', '2', '3']);
		expect(context.ReputeGroup[1].ReputeList).toEqual([1, 2]);
		expect(Object.values(context.ReputeGroup).map(entry => entry.Name)).toEqual(['魔物伙伴', '阿卢纳贝兹']);
		expect(Object.values(context.ReputeInfo).map(entry => entry.Name)).toEqual(['兽人部落', '哥布灵部落', '灰狼村']);
		expect(context.ReputeInfo[3].Invisible).toBe('VISIBLE_EXIST');
		expect(onEnd).toHaveBeenCalledTimes(2);
		expect(context.console.error).not.toHaveBeenCalled();
	});

	it.each([20211102, 20211119, 20220329])('does not request unsupported protocol %i tables', version => {
		const { pending, context } = load(version);
		expect(pending).toHaveLength(0);
		expect(context.onLoad).not.toHaveBeenCalled();
	});
});
