import { toPlainRagnarokText } from 'Utils/RagnarokText.js';
import DB from 'DB/DBManager.js';
import Inventory from 'UI/Components/Inventory/Inventory.js';
import Session from 'Engine/SessionStorage.js';
import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import {
	validateEnchantItem,
	getNextEnchantSlot,
	getUpgradeCandidates,
	getBaseSlotCount,
	getSlotValue,
	setSlotValue,
	getItemGrade
} from './EnchantRules.js';
import { createGameInventory } from './GameInventory.js';
import { showInteraction, clearInteraction, interactionSnapshot } from './ServerInteraction.js';
let currentService;
export function finishGameEnchant(pkt) {
	return currentService?.result(pkt);
}
export function openGameEnchant(groupId) {
	const group = DB.getEnchantGroup(groupId),
		token = Symbol('enchant'),
		inventory = createGameInventory(() => true);
	let guard = () => false,
		selected = null,
		pending = null,
		message = group ? '请选择装备' : `附魔组数据缺失：${groupId}`;
	const current = () => Session.Playing && interactionSnapshot()?.token === token;
	const allowed = () => current() && guard() && !pending && Session.Entity?.action !== Session.Entity?.ACTION.DIE;
	const live = () => selected && Inventory.getUI().getItemByIndex(selected.index);
	const itemId = entry => entry?.id || DB.getItemIdfromBase(entry?.base) || 0;
	const name = entry => {
		const id = itemId(entry);
		return id ? DB.getItemInfo(id).identifiedDisplayName : entry?.base || '';
	};
	function choices(item) {
		if (!validateEnchantItem(item, group).ok) return [];
		const slot = getNextEnchantSlot(item, group),
			data = slot === null ? null : group.slots[slot],
			rows = [];
		if (data?.random && Object.keys(data.random).length)
			rows.push({
				key: 'random',
				action: 'random',
				slot,
				name: '随机附魔',
				rate: Math.min(100000, (data.successRate || 0) + (data.gradeBonus?.[getItemGrade(item)] || 0)),
				...data.require,
				results: (data.random[getItemGrade(item)] || data.random[0] || []).map(name)
			});
		for (const [key, value] of Object.entries(data?.perfect || {}))
			rows.push({
				key: `perfect:${key}`,
				action: 'perfect',
				slot,
				ITID: itemId(value),
				name: `指定附魔：${name(value)}`,
				rate: 100000,
				zeny: value.zeny,
				materials: value.materials
			});
		for (const candidate of getUpgradeCandidates(item, group))
			rows.push({
				key: `upgrade:${candidate.slotNum}`,
				action: 'upgrade',
				slot: candidate.slotNum,
				name: `升级槽位 ${candidate.slotNum + 1}：${name(candidate.entry.result)}`,
				rate: 100000,
				zeny: candidate.entry.zeny,
				materials: candidate.entry.materials
			});
		const slots = group.slotOrder?.length ? group.slotOrder : [0, 1, 2, 3];
		if (
			group.reset?.enabled &&
			slots.some(slotNum => slotNum >= getBaseSlotCount(item) && getSlotValue(item, slotNum))
		)
			rows.push({
				key: 'reset',
				action: 'reset',
				name: '重置附魔',
				slot: null,
				rate: group.reset.rate,
				zeny: group.reset.zeny,
				materials: group.reset.materials
			});
		return rows.map(row => ({
			...row,
			zeny: row.zeny || 0,
			materials: (row.materials || []).map(material => ({
				...material,
				ITID: itemId(material),
				name: name(material)
			}))
		}));
	}
	function identity(item) {
		return JSON.stringify([item?.ITID, item?.RefiningLevel, item?.enchantgrade, item?.slot, item?.Options]);
	}
	const service = {
		setOperationGuard(fn) {
			guard = fn;
		},
		snapshot() {
			const item = live();
			return {
				items: group
					? inventory
							.snapshot()
							.filter(
								entry =>
									!entry.worn &&
									validateEnchantItem(Inventory.getUI().getItemByIndex(entry.index), group).ok
							)
					: [],
				selected,
				choices: item && item.ITID === selected.ID ? choices(item) : [],
				allowed: allowed(),
				message,
				pending: !!pending
			};
		},
		select(index, id) {
			if (!allowed()) return '当前不能操作';
			const item = Inventory.getUI().getItemByIndex(index);
			if (!item || item.ITID !== id) return '装备已变化';
			const valid = validateEnchantItem(item, group);
			if (!valid.ok) return valid.message;
			selected = { index, ID: id, identity: identity(item) };
			return '';
		},
		confirm(key, expected) {
			if (!allowed()) return '当前不能操作';
			const item = live();
			if (
				!item ||
				item.ITID !== selected.ID ||
				identity(item) !== selected.identity ||
				!service.snapshot().items.some(entry => entry.index === selected.index)
			)
				return '装备已变化';
			const choice = choices(item).find(entry => entry.key === key);
			if (!choice || JSON.stringify(choice) !== expected) return '附魔条件已变化，请重新核对';
			if (choice.action === 'perfect' && !choice.ITID) return '附魔数据无效';
			if (Session.zeny < choice.zeny) return 'Zeny 不足';
			const needed = new Map();
			for (const material of choice.materials) {
				if (!material.ITID) return '附魔材料数据无效';
				needed.set(material.ITID, (needed.get(material.ITID) || 0) + (material.count || 0));
			}
			for (const [id, count] of needed) {
				if (
					Inventory.getUI()
						.list.filter(entry => entry.ITID === id)
						.reduce((sum, entry) => sum + (entry.count || 0), 0) < count
				)
					return '材料不足';
			}
			const constructors = {
				random: PACKET.CZ.REQUEST_RANDOM_ENCHANT,
				perfect: PACKET.CZ.REQUEST_PERFECT_ENCHANT,
				upgrade: PACKET.CZ.REQUEST_UPGRADE_ENCHANT,
				reset: PACKET.CZ.REQUEST_RESET_ENCHANT
			};
			const pkt = new constructors[choice.action]();
			pkt.enchant_group = groupId;
			pkt.index = selected.index;
			if (choice.action === 'perfect') pkt.ITID = choice.ITID;
			if (choice.action === 'upgrade') pkt.slot = choice.slot;
			pending = { ...choice, item, index: selected.index, identity: identity(item) };
			message = '等待附魔结果';
			showInteraction({ kind: 'enchant', title: '装备附魔', token, service, canClose: false, close });
			Network.sendPacket(pkt);
			return '';
		},
		result(pkt) {
			if (!current() || !pending) return false;
			const item = Inventory.getUI().getItemByIndex(pending.index);
			if (pkt.msgId === 3857 && item && identity(item) === pending.identity) {
				if (pending.action === 'reset') {
					for (const slot of group.slotOrder?.length ? group.slotOrder : [0, 1, 2, 3])
						if (slot >= getBaseSlotCount(item)) setSlotValue(item, slot, 0);
				} else if (pkt.ITID && pending.slot !== null) setSlotValue(item, pending.slot, pkt.ITID);
			}
			pending = null;
			selected = null;
			message = DB.getMessage(pkt.msgId) || `附魔结果：${pkt.msgId}`;
			const resultToken = Symbol('enchant-result');
			showInteraction({
				kind: 'information',
				title: '附魔结果',
				token: resultToken,
				rows: [
					['结果', toPlainRagnarokText(message)],
					['提示', '继续附魔需重新打开附魔窗口']
				],
				close() {
					if (interactionSnapshot()?.token === resultToken) clearInteraction('information');
				}
			});
			return true;
		}
	};
	function close() {
		if (!current() || pending) return;
		clearInteraction('enchant');
		Network.sendPacket(new PACKET.CZ.CLOSE_UI_ENCHANT());
	}
	currentService = service;
	showInteraction({ kind: 'enchant', title: '装备附魔', token, service, close });
	return service;
}
