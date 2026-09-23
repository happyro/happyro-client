import ItemType from 'DB/Items/ItemType.js';

export const consumables = [ItemType.HEALING, ItemType.USABLE, ItemType.CASH];
export const equipment = [ItemType.WEAPON, ItemType.ARMOR, ItemType.SHADOWGEAR, ItemType.PETARMOR, ItemType.AMMO];
export const usableItems = [...consumables, ...equipment];

// Non-stackable equipment packets omit count; an equip/unequip cycle may also leave it at zero.
export function itemQuantity(item) {
	if (!item) return 0;
	return equipment.includes(item.type) && item.type !== ItemType.AMMO ? 1 : item.count || 0;
}
