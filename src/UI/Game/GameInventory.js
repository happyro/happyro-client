import Inventory from 'UI/Components/Inventory/Inventory.js';
import Equipment from 'UI/Components/Equipment/Equipment.js';
import { consumables, equipment, itemQuantity } from './InventoryItems.js';
import DB from 'DB/DBManager.js';
import Client from 'Core/Client.js';
import Session from 'Engine/SessionStorage.js';
import { toPlainRagnarokText } from 'Utils/RagnarokText.js';

/** Read live inventory identities; never optimistically mutate server-owned counts or equipment. */
export function createGameInventory(canOperate) {
	const icons = new Map();
	function entries() {
		const items = new Map(
			Inventory.getUI()
				.list.filter(item => itemQuantity(item) > 0)
				.map(item => [item.index, { item, worn: false }])
		);
		for (const item of Equipment.getUI().getItems()) items.set(item.index, { item, worn: true });
		return [...items.values()];
	}
	function available() {
		return Boolean(
			canOperate() && Session.Playing && Session.Entity && Session.Entity.action !== Session.Entity.ACTION.DIE
		);
	}
	function describe({ item, worn }) {
		const info = DB.getItemInfo(item.ITID);
		const file = item.IsIdentified ? info.identifiedResourceName : info.unidentifiedResourceName;
		if (file && !icons.has(file)) {
			icons.set(file, '');
			Client.loadFile(`${DB.INTERFACE_PATH}item/${file}.bmp`, url => icons.set(file, url));
		}
		const equippable = equipment.includes(item.type);
		const usable = consumables.includes(item.type);
		const action = worn ? 'unequip' : equippable ? 'equip' : usable ? 'use' : null;
		const reason = !available()
			? '当前无法操作物品'
			: !worn && equippable && !item.IsIdentified
				? '装备尚未鉴定'
				: !worn && equippable && item.IsDamaged
					? '装备已损坏'
					: !action
						? '此物品没有直接使用操作'
						: '';
		return {
			index: item.index,
			ID: item.ITID,
			name: DB.getItemName(item),
			count: itemQuantity(item),
			icon: icons.get(file) || '',
			worn,
			category: equippable ? 'equipment' : usable ? 'usable' : 'other',
			description: toPlainRagnarokText(
				item.IsIdentified ? info.identifiedDescriptionName : info.unidentifiedDescriptionName
			),
			action,
			reason,
			shortcut: !worn && (equippable || usable),
			identified: Boolean(item.IsIdentified),
			damaged: Boolean(item.IsDamaged)
		};
	}
	return {
		snapshot: () => entries().map(describe),
		act(index, id, action) {
			const entry = entries().find(({ item }) => item.index === index && item.ITID === id);
			if (!entry) return '物品已经变化，请重新选择';
			const state = describe(entry);
			if (state.reason) return state.reason;
			if (state.action !== action) return '穿戴状态已经变化，请重新选择操作';
			if (action === 'unequip') Equipment.getUI().onUnEquip(index);
			else if (action === 'equip') Inventory.getUI().onEquipItem(index, entry.item.location);
			else if (Inventory.getUI().onUseItem(index) === false) return '当前无法使用此物品';
			return '已发送请求，结果以服务器回复为准';
		},
		canBind(index, id) {
			const entry = entries().find(({ item }) => item.index === index && item.ITID === id);
			return Boolean(entry && available() && describe(entry).shortcut);
		}
	};
}
