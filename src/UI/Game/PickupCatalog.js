import ItemType from 'DB/Items/ItemType.js';
import { searchAdventureItems } from 'UI/Components/GameTools/AdventureControlService.js';
import { pickupCategory } from './PickupSettings.js';

const types = {
	Healing: 'consumable',
	Usable: 'consumable',
	DelayConsume: 'consumable',
	Cash: 'consumable',
	Weapon: 'equipment',
	Armor: 'equipment',
	ShadowGear: 'equipment',
	PetArmor: 'equipment',
	Card: 'card'
};
const cache = new Map();
let pending = false;
/** Re-entering view uses ITEM_ENTRY, which has no type. Resolve it from the existing item catalog. */
export function matchesPickupCategory(item, categories) {
	if (!categories.length) return false;
	if (categories.length === 4) return true;
	// The protocol disguises pet eggs as armor; use the catalog to distinguish them.
	if (Number.isInteger(item.type) && item.type !== ItemType.ARMOR)
		return categories.includes(pickupCategory(item.type));
	const entry = cache.get(item.itemId);
	if (entry?.category) return categories.includes(entry.category);
	if (!pending && (!entry || entry.retryAt <= Date.now())) {
		pending = true;
		cache.set(item.itemId, { retryAt: Date.now() + 10000 });
		searchAdventureItems({ query: String(item.itemId), perPage: 30 })
			.then(result => {
				const found = result.data.find(row => row.Id === item.itemId);
				if (found) cache.set(item.itemId, { category: types[found.Type] || 'other' });
			})
			.catch(() => {})
			.finally(() => {
				pending = false;
			});
	}
	return false;
}
