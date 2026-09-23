vi.mock('UI/Components/Inventory/Inventory.js', () => ({ default: { getUI: () => ({ prepare: vi.fn(), clearItems: s.inventoryClear }) } }));
vi.mock('UI/Components/Equipment/Equipment.js', () => ({ default: { getUI: () => ({ prepare: vi.fn(), clearItems: s.equipmentClear }) } }));
vi.mock('UI/Components/CartItems/CartItems.js', () => ({ default: { prepare: vi.fn(), clearItems: s.cartClear } }));
import { beforeEach, expect, it, vi } from 'vitest';
const s = vi.hoisted(() => ({ inventoryClear: vi.fn(), equipmentClear: vi.fn(), cartClear: vi.fn(), mobile: true, hooks: new Map(), send: vi.fn(), items: [], append: vi.fn(), prepare: vi.fn(), remove: vi.fn(), capacity: null }));
vi.mock('UI/Platform.js', () => ({ default: { get isMobile() { return s.mobile; } } }));
vi.mock('Network/PacketVerManager.js', () => ({ default: { value: 20211103 } }));
vi.mock('Network/NetworkManager.js', () => ({ default: { sendPacket: s.send, hookPacket: (kind, handler) => s.hooks.set(kind,handler) } }));
vi.mock('Network/PacketStructure.js', () => {
 const group = () => new Proxy({}, { get(target,key) { return target[key] ||= class { constructor() { this.packetName=key; } }; } });
 return { default: { CZ: group(), ZC: group() } };
});
vi.mock('UI/Components/Storage/Storage.js', () => ({ default: { getUI: () => ({ prepare: s.prepare, append: s.append, remove:s.remove, clearItems:()=>{s.items=[];}, setItems:items=>s.items.push(...items), setItemInfo:(current,limit)=>{s.capacity={current,limit};}, addItem:item=>s.items.push(item), removeItem: index=>{s.items=s.items.filter(item=>item.index!==index);}, ui:{find:()=>({text:vi.fn()})} }) } }));
import PACKET from 'Network/PacketStructure.js';
import Storage from 'UI/Components/Storage/Storage.js';
import initialize from '../../src/Engine/MapEngine/Storage.js';
import { interactionSnapshot, clearInteraction } from '../../src/UI/Game/ServerInteraction.js';
const receive=(name,data={})=>s.hooks.get(PACKET.ZC[name])(data);
beforeEach(()=>{vi.clearAllMocks();clearInteraction();s.mobile=true;s.items=[];s.hooks.clear();initialize();receive('SPLIT_SEND_ITEMLIST_SET',{invType:2,name:'Storage'});});
it('opens only the mobile modal and preserves items on capacity refreshes',()=>{
 receive('STORE_NORMAL_ITEMLIST',{itemInfo:[{index:2,ITID:501,count:3}]});receive('NOTIFY_STOREITEM_COUNTINFO',{curCount:1,maxCount:600});
 expect(s.append).not.toHaveBeenCalled();expect(interactionSnapshot().kind).toBe('storage');expect(s.items).toHaveLength(1);
 const token=interactionSnapshot().token;receive('NOTIFY_STOREITEM_COUNTINFO',{curCount:1,maxCount:600});expect(interactionSnapshot().token).toBe(token);expect(s.items).toHaveLength(1);
 interactionSnapshot().close();expect(s.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({packetName:'CLOSE_STORE'}));expect(s.items).toEqual([]);expect(interactionSnapshot()).toBeNull();
});
it('uses existing packet callbacks for storage routes and handles server close without a second close request',()=>{
 Storage.reqAddItem(2,3);Storage.reqRemoveItem(4,2);Storage.reqAddItemFromCart(5,1);Storage.reqMoveItemToCart(6,1);
 expect(s.send.mock.calls.map(([pkt])=>pkt.packetName)).toEqual(['MOVE_ITEM_FROM_BODY_TO_STORE2','MOVE_ITEM_FROM_STORE_TO_BODY2','MOVE_ITEM_FROM_CART_TO_STORE','MOVE_ITEM_FROM_STORE_TO_CART']);
 receive('NOTIFY_STOREITEM_COUNTINFO',{curCount:0,maxCount:600});receive('CLOSE_STORE');expect(s.send).toHaveBeenCalledTimes(4);expect(interactionSnapshot()).toBeNull();
});
it('keeps the original desktop append path and does not publish a mobile modal',()=>{
 s.mobile=false;receive('NOTIFY_STOREITEM_COUNTINFO',{curCount:0,maxCount:600});expect(s.append).toHaveBeenCalledOnce();expect(interactionSnapshot()).toBeNull();
});

it('resets mobile container models at full-list boundaries without relying on detached DOM lifecycle',()=>{
 receive('SPLIT_SEND_ITEMLIST_SET',{invType:0,name:''});expect(s.inventoryClear).toHaveBeenCalledOnce();expect(s.equipmentClear).toHaveBeenCalledOnce();
 receive('SPLIT_SEND_ITEMLIST_SET',{invType:1,name:''});expect(s.cartClear).toHaveBeenCalledOnce();
 s.mobile=false;receive('SPLIT_SEND_ITEMLIST_SET',{invType:0,name:''});receive('SPLIT_SEND_ITEMLIST_SET',{invType:1,name:''});expect(s.inventoryClear).toHaveBeenCalledOnce();expect(s.cartClear).toHaveBeenCalledOnce();
});
