import Session from 'Engine/SessionStorage.js';
import Inventory from 'UI/Components/Inventory/Inventory.js';
import Equipment from 'UI/Components/Equipment/Equipment.js';
import Storage from 'UI/Components/Storage/Storage.js';
import Cart from 'UI/Components/CartItems/CartItems.js';
import { createGameInventory } from './GameInventory.js';
import { interactionSnapshot } from './ServerInteraction.js';

export function createGameContainers(canOperate) {
	const inventory = createGameInventory(canOperate);
	function available() {
		return canOperate() && Session.Playing && Session.Entity && Session.Entity.action !== Session.Entity.ACTION.DIE;
	}
	function sources() {
		return [
			'inventory',
			...(interactionSnapshot()?.kind === 'storage' ? ['storage'] : []),
			...(Session.Entity?.hasCart ? ['cart'] : [])
		];
	}
	function raw(source) {
		if (source === 'storage') return Storage.getUI().getItems();
		if (source === 'cart') return Cart.list;
		const worn = new Set(
			Equipment.getUI()
				.getItems()
				.map(item => item.index)
		);
		return Inventory.getUI().list.filter(item => !item.equipped && !worn.has(item.index));
	}
	return {
		snapshot(source) {
			const containers = sources();
			return {
				containers,
				allowed: Boolean(available()),
				items: containers.includes(source)
					? raw(source)
							.map(inventory.describe)
							.filter(item => item.count > 0)
					: [],
				capacity:
					source === 'storage' ? Storage.getUI().getCapacity() : source === 'cart' ? Cart.capacity : null
			};
		},
		transfer(source, destination, index, id, count) {
			const containers = sources();
			if (
				!available() ||
				source === destination ||
				!containers.includes(source) ||
				!containers.includes(destination)
			)
				return '当前不能转移物品';
			const item = raw(source).find(entry => entry.index === index && entry.ITID === id);
			if (
				!item ||
				!Number.isInteger(count) ||
				count < 1 ||
				count > 2147483647 ||
				count > inventory.describe(item).count
			)
				return '物品或数量已经变化，请重新选择';
			const routes = {
				'inventory:storage': Storage.reqAddItem,
				'storage:inventory': Storage.reqRemoveItem,
				'cart:storage': Storage.reqAddItemFromCart,
				'storage:cart': Storage.reqMoveItemToCart,
				'inventory:cart': Inventory.getUI().reqMoveItemToCart,
				'cart:inventory': Cart.reqRemoveItem
			};
			routes[`${source}:${destination}`](index, count);
			return '已请求转移，等待服务器更新';
		}
	};
}
