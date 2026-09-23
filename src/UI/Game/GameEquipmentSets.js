import Inventory from 'UI/Components/Inventory/Inventory.js';
import SwitchEquip from 'UI/Components/SwitchEquip/SwitchEquip.js';
import Session from 'Engine/SessionStorage.js';
import { createGameInventory } from './GameInventory.js';
import { equipmentSlots } from './GameEquipment.js';
let revision = 0;
export function notifyEquipmentSetResult() {
	revision++;
}
export function createGameEquipmentSets(canOperate) {
	const inventory = createGameInventory(canOperate);
	let pending = null,
		lastSwap = 0;
	function snapshot() {
		if (pending !== null && pending !== revision) pending = null;
		const reserved = Inventory.getUI().equipswitchlist;
		return {
			allowed:
				!!(canOperate() && Session.Playing && Session.Entity?.action !== Session.Entity?.ACTION.DIE) &&
				pending === null,
			slots: equipmentSlots,
			items: inventory
				.snapshot()
				.filter(item => !item.worn && item.category === 'equipment')
				.map(item => ({
					...item,
					registered: reserved.some(row => row.index === item.index),
					registeredLocation: reserved.find(row => row.index === item.index)?.location
				})),
			pending: pending !== null
		};
	}
	return {
		snapshot,
		act(index, id, location, action) {
			const state = snapshot(),
				item = state.items.find(row => row.index === index && row.ID === id);
			if (!state.allowed || !item) return '装备或状态已变化';
			if (action === 'add') {
				if (
					item.registered ||
					!item.identified ||
					item.damaged ||
					!equipmentSlots.some(slot => slot.location === location && item.location & location)
				)
					return '请选择有效部位和可用装备';
				pending = revision;
				SwitchEquip.onAddSwitchEquip(index, location);
			} else if (action === 'remove') {
				if (!item.registered) return '装备未加入方案';
				pending = revision;
				SwitchEquip.onRemoveSwitchEquip(index);
			} else return '未知操作';
			return '已请求，等待服务器更新';
		},
		swap() {
			if (!snapshot().allowed || !Inventory.getUI().equipswitchlist.length || Date.now() - lastSwap < 10000)
				return '请等待后再切换';
			lastSwap = Date.now();
			SwitchEquip.RequestSwitch();
			return '已请求切换，结果以服务器回复为准';
		}
	};
}
