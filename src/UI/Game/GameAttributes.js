import Session from 'Engine/SessionStorage.js';
import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import JobPropertyTable from 'DB/Jobs/JobPropertyTable.js';
import { characterStats, characterStatValues, characterStatResult } from './CharacterStats.js';
import { pointResetState, resetCharacterPoints } from './GamePointReset.js';

const baseFields = [
	['str', '力量 STR', 13],
	['agi', '敏捷 AGI', 14],
	['vit', '体力 VIT', 15],
	['int', '智力 INT', 16],
	['dex', '灵巧 DEX', 17],
	['luk', '幸运 LUK', 18]
];
const traitFields = [
	['pow', '力量 POW', 219],
	['sta', '耐力 STA', 220],
	['wis', '智慧 WIS', 221],
	['spl', '法力 SPL', 222],
	['con', '专注 CON', 223],
	['crt', '创造 CRT', 224]
];

export function createGameAttributes(canOperate) {
	let owner,
		pending = null,
		message = '',
		previous = null;
	function snapshot() {
		const entity = Session.Entity;
		if (owner !== entity) {
			owner = entity;
			pending = previous = null;
			message = '';
		}
		if (pending) {
			const result = characterStatResult(entity, pending.id);
			if (result !== pending.result) {
				message = result.success ? `${pending.label}已增加 1 点` : '加点未成功，请检查剩余点数和素质上限';
				pending = null;
			} else if (performance.now() - pending.at >= 8000) {
				message = '暂未收到服务器确认，请核对当前数值后重试';
				pending = null;
			}
		}
		const values = characterStatValues(entity);
		const reset = pointResetState(entity);
		const allowed = Boolean(canOperate() && Session.Playing && entity && entity.action !== entity.ACTION.DIE);
		const traits = Boolean(JobPropertyTable[entity?._job ?? entity?.job]?.isFourthClass);
		const section = (fields, points, enabled) => ({
			points: values[points] ?? null,
			enabled,
			rows: fields.map(([key, label, id]) => {
				const value = values[key],
					bonus = values[key + '2'] || 0,
					cost = values[key + '3'];
				return {
					key,
					label,
					id,
					value: value ?? null,
					bonus,
					cost: cost ?? null,
					canAdd: Boolean(
						allowed &&
						enabled &&
						!pending &&
						!reset.pending &&
						value !== undefined &&
						cost > 0 &&
						values[points] >= cost
					)
				};
			})
		});
		const related = {
			base: [
				{ key: 'maxHp', label: '最大 HP', value: entity?.life?.hp_max ?? '—' },
				{ key: 'maxSp', label: '最大 SP', value: entity?.life?.sp_max ?? '—' },
				...characterStats(entity).filter(stat => !baseFields.some(([key]) => key === stat.key))
			],
			traits: [
				['patk', '物理攻击倍率 P.ATK'],
				['smatk', '魔法攻击倍率 S.MATK'],
				['res', '物理抗性 RES'],
				['mres', '魔法抗性 MRES'],
				['hplus', '治疗加成 H.PLUS'],
				['crate', '暴击伤害 C.RATE']
			].map(([key, label]) => ({ key, label, value: values[key] ?? '—' }))
		};
		return {
			base: section(baseFields, 'statuspoint', true),
			traits: section(traitFields, 'trait_point', traits),
			allowed: allowed && !pending && !reset.pending,
			pending: Boolean(pending || reset.pending),
			message: reset.pending ? reset.message : message,
			related: Object.fromEntries(
				Object.entries(related).map(([kind, rows]) => [
					kind,
					rows.map(row => ({
						...row,
						previous: previous?.[kind]?.find(entry => entry.key === row.key)?.value
					}))
				])
			)
		};
	}
	return {
		snapshot,
		increase(kind, key) {
			const state = snapshot();
			const row = state[kind]?.rows?.find(entry => entry.key === key);
			if (!row?.canAdd) return '当前不能增加这项素质';
			previous = state.related;
			pending = {
				id: row.id,
				label: row.label,
				result: characterStatResult(owner, row.id),
				at: performance.now()
			};
			message = '正在加点…';
			const packet = new PACKET.CZ.STATUS_CHANGE();
			packet.statusID = row.id;
			packet.changeAmount = 1;
			Network.sendPacket(packet);
			return message;
		},
		async reset(kind) {
			const state = snapshot();
			if (!state.allowed || !['base', 'traits'].includes(kind) || !state[kind].enabled)
				return '当前不能重置素质点';
			previous = state.related;
			const entity = owner;
			const result = await resetCharacterPoints(kind, entity);
			if (entity === Session.Entity) message = result;
			return result;
		}
	};
}
