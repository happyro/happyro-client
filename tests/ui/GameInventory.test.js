import { beforeEach, expect, it, vi } from 'vitest';
const s = vi.hoisted(() => ({ items: [], equipped: [], allowed: true, session: { Playing: true, Entity: { action: 0, ACTION: { DIE: 99 } } }, use: vi.fn(), equip: vi.fn(), unequip: vi.fn() }));
vi.mock('UI/Components/Inventory/Inventory.js', () => ({ default: { getUI: () => ({ list: s.items, onUseItem: s.use, onEquipItem: s.equip }) } }));
vi.mock('UI/Components/Equipment/Equipment.js', () => ({ default: { getUI: () => ({ getItems: () => s.equipped, onUnEquip: s.unequip }) } }));
vi.mock('Engine/SessionStorage.js', () => ({ default: s.session }));
vi.mock('Core/Client.js', () => ({ default: { loadFile: (_, fn) => fn('image') } }));
vi.mock('DB/DBManager.js', () => ({ default: { INTERFACE_PATH: '', getItemInfo: () => ({ identifiedResourceName: 'item', identifiedDescriptionName: ['^ff0000说明', '第二行'], unidentifiedDescriptionName: '未鉴定说明' }), getItemName: item => `物品${item.ITID}` } }));
import { createGameInventory } from '../../src/UI/Game/GameInventory.js';
const item = (index, type = 0) => ({ index, ITID: 501, count: 3, type, IsIdentified: true, location: 16 });
beforeEach(() => { vi.clearAllMocks(); s.items = [item(2), item(3, 4)]; s.equipped = []; s.allowed = true; s.session.Playing = true; s.session.Entity.action = 0; });
it('uses exact item index, revalidates identity and preserves counts until the server reply', () => {
 const inventory = createGameInventory(() => s.allowed);
 inventory.act(2, 501, 'use'); expect(s.use).toHaveBeenCalledExactlyOnceWith(2); expect(s.items[0].count).toBe(3);
 s.items[0].ITID = 502; inventory.act(2, 501, 'use'); expect(s.use).toHaveBeenCalledTimes(1);
 s.items = []; expect(inventory.snapshot()).toEqual([]); inventory.act(3, 501, 'equip'); expect(s.equip).not.toHaveBeenCalled();
});
it('merges equipment by index, handles server-confirmed wear transitions and rejects stale actions', () => {
 const inventory = createGameInventory(() => true);
 inventory.act(3, 501, 'equip'); expect(s.equip).toHaveBeenCalledExactlyOnceWith(3, 16);
 s.equipped = [s.items.pop()]; expect(inventory.snapshot().find(i => i.index === 3).worn).toBe(true);
 inventory.act(3, 501, 'equip'); expect(s.equip).toHaveBeenCalledTimes(1);
 inventory.act(3, 501, 'unequip'); expect(s.unequip).toHaveBeenCalledExactlyOnceWith(3);
 s.items.push(s.equipped[0]); expect(inventory.snapshot()).toHaveLength(2);
});
it('blocks dead/disconnected/externally blocked states and damaged or unidentified equip, but permits removal', () => {
 const inventory = createGameInventory(() => s.allowed);
 s.allowed = false; inventory.act(2, 501, 'use'); expect(inventory.canBind(2, 501)).toBe(false);
 s.allowed = true; s.session.Entity.action = 99; inventory.act(2, 501, 'use');
 s.session.Entity.action = 0; s.session.Playing = false; inventory.act(2, 501, 'use'); expect(s.use).not.toHaveBeenCalled();
 s.session.Playing = true; s.items[1].IsIdentified = false; inventory.act(3, 501, 'equip');
 expect(inventory.snapshot()[1].description).toBe('未鉴定说明');
 s.items[1].IsIdentified = true; s.items[1].IsDamaged = true; inventory.act(3, 501, 'equip'); expect(s.equip).not.toHaveBeenCalled();
 s.equipped = [s.items.pop()]; inventory.act(3, 501, 'unequip'); expect(s.unequip).toHaveBeenCalledOnce();
});
it('describes plain text safely, categorizes materials, and rejects direct use or binding of unsupported items', () => {
 const inventory = createGameInventory(() => true);
 s.items.push(item(4, 3)); expect(inventory.snapshot()[0].description).toBe('说明\n第二行');
 expect(inventory.snapshot()[2].category).toBe('other'); expect(inventory.canBind(4, 501)).toBe(false);
 inventory.act(4, 501, 'use'); expect(s.use).not.toHaveBeenCalled(); expect(inventory.canBind(2, 501)).toBe(true);
});

it('keeps non-stackable equipment visible when packet data has no count or a zero count after wearing', () => {
 const inventory = createGameInventory(() => true);
 delete s.items[1].count;
 expect(inventory.snapshot().find(i => i.index === 3).count).toBe(1);
 s.items[1].count = 0;
 expect(inventory.snapshot().find(i => i.index === 3).action).toBe('equip');
 inventory.act(3, 501, 'equip'); expect(s.equip).toHaveBeenCalledExactlyOnceWith(3, 16);
});
