import Location from 'DB/Items/EquipmentLocation.js';

export const equipmentSlots = [
	['HEAD_TOP', '头饰（上）', 'normal'],
	['HEAD_MID', '头饰（中）', 'normal'],
	['HEAD_BOTTOM', '头饰（下）', 'normal'],
	['WEAPON', '右手／武器', 'normal'],
	['SHIELD', '左手／盾牌', 'normal'],
	['ARMOR', '铠甲', 'normal'],
	['GARMENT', '披肩', 'normal'],
	['SHOES', '鞋子', 'normal'],
	['ACCESSORY1', '饰品（右）', 'normal'],
	['ACCESSORY2', '饰品（左）', 'normal'],
	['AMMO', '弹药', 'normal'],
	['COSTUME_HEAD_TOP', '时装头饰（上）', 'costume'],
	['COSTUME_HEAD_MID', '时装头饰（中）', 'costume'],
	['COSTUME_HEAD_BOTTOM', '时装头饰（下）', 'costume'],
	['COSTUME_ROBE', '时装披肩', 'costume'],
	['COSTUME_FLOOR', '时装地面', 'costume'],
	['SHADOW_WEAPON', '影子武器', 'shadow'],
	['SHADOW_SHIELD', '影子盾牌', 'shadow'],
	['SHADOW_ARMOR', '影子铠甲', 'shadow'],
	['SHADOW_SHOES', '影子鞋子', 'shadow'],
	['SHADOW_R_ACCESSORY_SHADOW', '影子饰品（右）', 'shadow'],
	['SHADOW_L_ACCESSORY_SHADOW', '影子饰品（左）', 'shadow']
].map(([key, label, group]) => ({ key, label, group, location: Location[key] }));

export function createEquipmentController(inventory, stats) {
	function snapshot() {
		const items = inventory.snapshot();
		return {
			slots: equipmentSlots.map(slot => ({
				...slot,
				item: items.find(item => item.worn && item.wearLocation & slot.location),
				candidates: items.filter(
					item => !item.worn && item.category === 'equipment' && item.location & slot.location
				)
			})),
			stats: stats()
		};
	}
	return {
		snapshot,
		act(slotKey, index, id, action) {
			const slot = snapshot().slots.find(entry => entry.key === slotKey);
			if (!slot) return '请选择装备部位';
			const item =
				action === 'unequip'
					? slot.item
					: action === 'equip'
						? slot.candidates.find(entry => entry.index === index && entry.ID === id)
						: null;
			if (!item || item.index !== index || item.ID !== id) return '装备已经变化，请重新选择';
			return inventory.act(index, id, action, action === 'equip' ? slot.location : undefined);
		}
	};
}
