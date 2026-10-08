import { beforeEach, expect, it, vi } from 'vitest';
const s = vi.hoisted(() => ({ body: [], storage: [], cart: [], equipped: [], allowed: true, session: { Playing: true, Entity: { hasCart: true, action: 0, ACTION: { DIE: 99 } } }, routes: Array.from({ length: 6 }, () => vi.fn()) }));
vi.mock('Engine/SessionStorage.js', () => ({ default: s.session }));
vi.mock('UI/Components/Inventory/Inventory.js', () => ({ default: { getUI: () => ({ list: s.body, reqMoveItemToCart: s.routes[4] }) } }));
vi.mock('UI/Components/Equipment/Equipment.js', () => ({ default: { getUI: () => ({ getItems: () => s.equipped }) } }));
vi.mock('UI/Components/Storage/Storage.js', () => ({ default: { getUI: () => ({ getItems: () => s.storage, getCapacity: () => ({ current: 1, limit: 600 }) }), reqAddItem: s.routes[0], reqRemoveItem: s.routes[1], reqAddItemFromCart: s.routes[2], reqMoveItemToCart: s.routes[3] } }));
vi.mock('UI/Components/CartItems/CartItems.js', () => ({ default: { get list() { return s.cart; }, reqRemoveItem: s.routes[5] } }));
vi.mock('UI/Game/GameInventory.js', () => ({ createGameInventory: () => ({ describe: item => ({ index: item.index, ID: item.ITID, count: item.count || 1 }) }) }));
import { acknowledgeStorageTransfer, storageTransferStatus } from '../../src/UI/Game/StorageTransfer.js';
import { createGameContainers } from '../../src/UI/Game/GameContainers.js';
import { showInteraction, clearInteraction } from '../../src/UI/Game/ServerInteraction.js';
beforeEach(() => { vi.clearAllMocks(); s.allowed = true; s.session.Playing = true; s.session.Entity.hasCart = true; s.session.Entity.action = 0; s.body = [{ index: 2, ITID: 501, count: 5 }]; s.storage = [{ index: 2, ITID: 502, count: 3 }]; s.cart = [{ index: 2, ITID: 503, count: 4 }]; s.equipped = []; showInteraction({ kind: 'storage' }); });
it('routes all six transfers by container identity without local optimistic mutations', () => {
 const service = createGameContainers(() => s.allowed);
 const cases = [['inventory','storage',501],['storage','inventory',502],['cart','storage',503],['storage','cart',502],['inventory','cart',501],['cart','inventory',503]];
 cases.forEach(([from,to,id], i) => { transfer(service,from,to,2,id,2); expect(s.routes[i]).toHaveBeenCalledExactlyOnceWith(2,2); acknowledgeStorageTransfer(to === 'storage' ? 'add' : 'remove', {index:2,ITID:id,count:2}); });
 expect(s.body[0].count).toBe(5); expect(s.storage[0].count).toBe(3); expect(s.cart[0].count).toBe(4);
});
it('rejects worn items, stale identities, invalid quantities and inaccessible containers', () => {
 const service = createGameContainers(() => s.allowed);
 for (const count of [0, 6, 1.5, -1, 2147483648]) transfer(service,'inventory','storage',2,501,count);
 transfer(service,'inventory','storage',2,502,1);
 s.equipped = [...s.body]; transfer(service,'inventory','storage',2,501,1); expect(service.snapshot('inventory').items).toEqual([]);
 s.equipped = []; clearInteraction(); transfer(service,'inventory','storage',2,501,1);
 s.session.Entity.hasCart = false; transfer(service,'inventory','cart',2,501,1);
 expect(s.routes.every(fn => fn.mock.calls.length === 0)).toBe(true);
});
it('honors death, disconnected state and a pre-existing modal freeze', () => {
 const service = createGameContainers(() => s.allowed);
 s.allowed = false; transfer(service,'inventory','cart',2,501,1);
 s.allowed = true; s.session.Entity.action = 99; transfer(service,'inventory','cart',2,501,1);
 s.session.Entity.action = 0; s.session.Playing = false; transfer(service,'inventory','cart',2,501,1);
 expect(s.routes[4]).not.toHaveBeenCalled();
});

it('blocks duplicate storage requests and waits for a matching server acknowledgement', () => {
 const service=createGameContainers(()=>true);
 const identity=service.snapshot('storage').items[0].identity;
 transfer(service,'storage','inventory',2,502,2,identity);
 transfer(service,'storage','inventory',2,502,2,identity);
 expect(s.routes[1]).toHaveBeenCalledTimes(1);
 acknowledgeStorageTransfer('remove',{index:8,count:2});
 expect(service.snapshot('storage').pending).toBe(true);
 acknowledgeStorageTransfer('remove',{index:2,count:2});
 expect(service.snapshot('storage').pending).toBe(false);
 expect(storageTransferStatus()).toContain('已取出');
 transfer(service,'inventory','storage',2,501,1);
 acknowledgeStorageTransfer('remove',{index:2,count:0});
 expect(storageTransferStatus()).toContain('未成功');
 expect(service.snapshot('storage').pending).toBe(false);
});
it('rejects replaced equipment and clears pending ownership on closing storage', () => {
 const service=createGameContainers(()=>true);
 const identity=service.snapshot('storage').items[0].identity;
 s.storage[0].RefiningLevel=10;
 transfer(service,'storage','inventory',2,502,1,identity);
 expect(s.routes[1]).not.toHaveBeenCalled();
 transfer(service,'inventory','storage',2,501,1);
 clearInteraction(); showInteraction({kind:'storage'});
 expect(service.snapshot('storage').pending).toBe(false);
 expect(storageTransferStatus()).toBe('');
});
it('does not retry or unlock uncertain requests after timeout', () => {
 vi.spyOn(Date,'now').mockReturnValue(10000);
 const service=createGameContainers(()=>true);
 transfer(service,'inventory','storage',2,501,1);
 Date.now.mockReturnValue(19000);
 expect(storageTransferStatus()).toContain('重新打开');
 expect(service.snapshot('storage').pending).toBe(true);
 transfer(service,'inventory','storage',2,501,1);
 expect(s.routes[0]).toHaveBeenCalledTimes(1);
 vi.restoreAllMocks();
});

function transfer(service,source,destination,index,id,count,expected=service.snapshot(source).items.find(item=>item.index===index&&item.ID===id)?.identity) {
 return service.transfer(source,destination,index,id,count,expected);
}
