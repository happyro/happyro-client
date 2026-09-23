vi.mock('UI/Game/GameVending.js',()=>({openVendingSetup:vi.fn(),vendingSetupFailed:vi.fn(),setOwnedVending:vi.fn(),updateOwnedVending:vi.fn(),finishOwnedBuying:vi.fn()}));
import { beforeEach, expect, it, vi } from 'vitest';
const s=vi.hoisted(()=>({mobile:true,hooks:new Map(),send:vi.fn(),open:vi.fn(),finish:vi.fn(()=>true),store:{append:vi.fn(),setType:vi.fn(),setList:vi.fn(),remove:vi.fn(),setClosePacketSent:vi.fn(),Type:{BUY:0,SELL:1}},items:[],remove:vi.fn(),chat:vi.fn()}));
vi.mock('UI/Platform.js',()=>({default:{get isMobile(){return s.mobile;}}}));
vi.mock('UI/Game/GameShop.js',()=>({openGameShop:s.open,finishGameShop:s.finish}));
vi.mock('DB/DBManager.js',()=>({default:{getMessage:id=>String(id)}}));
vi.mock('Engine/SessionStorage.js',()=>({default:{}}));
vi.mock('Renderer/EntityManager.js',()=>({default:{}}));
vi.mock('Network/NetworkManager.js',()=>({default:{sendPacket:s.send,hookPacket:(kind,fn)=>s.hooks.set(kind,fn)}}));
vi.mock('Network/PacketVerManager.js',()=>({default:{value:20211103}}));
vi.mock('Network/PacketStructure.js',()=>{const group=()=>new Proxy({}, {get(t,k){return t[k] ||= class {constructor(){this.packetName=k;this.itemList=[];this.list=[];}};}});return {default:{CZ:group(),ZC:group()}};});
vi.mock('UI/Components/Inventory/Inventory.js',()=>({default:{getUI:()=>({getItemById:()=>({index:6}),list:s.items,removeItem:s.remove})}}));
vi.mock('UI/Components/NpcStore/NpcStore.js',()=>({default:s.store}));
vi.mock('UI/Components/Vending/Vending.js',()=>({default:{}}));
vi.mock('UI/Components/VendingReport/VendingReport.js',()=>({default:{}}));
vi.mock('UI/Components/VendingShop/VendingShop.js',()=>({default:{}}));
vi.mock('UI/Components/ChatBox/ChatBox.js',()=>({default:{addText:s.chat,TYPE:{BLUE:0,ERROR:1},FILTER:{PUBLIC_LOG:0}}}));
import initialize from '../../src/Engine/MapEngine/Store.js';
import PACKET from 'Network/PacketStructure.js';
const receive=(name,pkt)=>s.hooks.get(PACKET.ZC[name])(pkt);
beforeEach(()=>{vi.clearAllMocks();s.mobile=true;s.hooks.clear();initialize();});
it('shares ordinary purchase and sale packet construction while keeping desktop windows unmounted on mobile',()=>{
 const offers=[{ITID:501,price:50}];receive('PC_PURCHASE_ITEMLIST2',{itemList:offers});expect(s.open).toHaveBeenLastCalledWith('buy',offers,expect.any(Function),expect.any(Function));
 let [, ,submit,quit]=s.open.mock.calls.at(-1);submit([{ITID:501,index:0,count:2}]);expect(s.send).toHaveBeenLastCalledWith(expect.objectContaining({packetName:'PC_PURCHASE_ITEMLIST',itemList:[{ITID:501,count:2}]}));quit();expect(s.send).toHaveBeenLastCalledWith(expect.objectContaining({packetName:'NPC_TRADE_QUIT'}));
 receive('PC_SELL_ITEMLIST',{itemList:[{index:4,price:10}]});[, ,submit]=s.open.mock.calls.at(-1);submit([{index:4,ITID:501,count:1}]);expect(s.send).toHaveBeenLastCalledWith(expect.objectContaining({packetName:'PC_SELL_ITEMLIST',itemList:[{index:4,count:1}]}));expect(s.store.append).not.toHaveBeenCalled();
 receive('PC_PURCHASE_RESULT',{result:2});expect(s.finish).toHaveBeenLastCalledWith('56');receive('PC_SELL_RESULT',{result:0});expect(s.finish).toHaveBeenLastCalledWith('54');
});
it('preserves desktop window presentation and the existing submit callback',()=>{
 s.mobile=false;const offers=[{ITID:501,price:50}];receive('PC_PURCHASE_ITEMLIST2',{itemList:offers});expect(s.store.append).toHaveBeenCalledOnce();expect(s.store.setList).toHaveBeenCalledWith(offers);expect(s.open).not.toHaveBeenCalled();s.store.onSubmit([{ITID:501,count:1}]);expect(s.send).toHaveBeenCalledOnce();
});

it('routes cash, limited-stock and both barter shop types through mobile orders using existing send callbacks',()=>{
 for (const [hook,type,closePacket,fields,entry,request] of [
  ['PC_CASH_POINT_ITEMLIST','cash','NPC_TRADE_QUIT',{KafraPoint:100},{ITID:501,count:1,price:20},'PC_BUY_CASH_POINT_ITEM'],
  ['NPC_MARKET_OPEN2','market','NPC_MARKET_CLOSE',{}, {ITID:501,count:1},'NPC_MARKET_PURCHASE'],
  ['NPC_BARTER_MARKET_ITEMINFO','barter','NPC_BARTER_MARKET_CLOSE',{}, {ITID:501,count:1,matcurrency:502,shopIndex:7},'NPC_BARTER_MARKET_PURCHASE'],
  ['NPC_EXPANDED_BARTER_MARKET_ITEMINFO','barter-expanded','NPC_EXPANDED_BARTER_MARKET_CLOSE',{}, {ITID:501,count:1,index:7},'NPC_EXPANDED_BARTER_MARKET_PURCHASE']
 ]) {
  receive(hook,{itemList:[],...fields});const [, ,submit,quit,options]=s.open.mock.calls.at(-1);expect(options.type).toBe(type);submit([entry]);expect(s.send).toHaveBeenLastCalledWith(expect.objectContaining({packetName:request}));quit();expect(s.send).toHaveBeenLastCalledWith(expect.objectContaining({packetName:closePacket}));
 }
 expect(s.store.append).not.toHaveBeenCalled();receive('PC_CASH_POINT_UPDATE',{Error:1});expect(s.finish).toHaveBeenLastCalledWith('1227');receive('NPC_MARKET_PURCHASE_RESULT2',{result:0});expect(s.finish).toHaveBeenLastCalledWith('54');receive('PC_PURCHASE_RESULT',{result:14});expect(s.finish).toHaveBeenLastCalledWith('3556');
});

it('opens a player sale with its store identity and updates inventory from buying-store receipts',()=>{
 const packet=new PACKET.ZC.PC_PURCHASE_ITEMLIST_FROMMC3();Object.assign(packet,{AID:99,UniqueID:123,itemList:[{index:3,ITID:501,count:4,price:10}]});receive('PC_PURCHASE_ITEMLIST_FROMMC3',packet);let [mode,offers,submit]=s.open.mock.calls.at(-1);expect(mode).toBe('buy');expect(offers[0].qty).toBe(4);submit([{index:3,count:2}]);expect(s.send).toHaveBeenLastCalledWith(expect.objectContaining({AID:99,UniqueID:123,itemList:[{index:3,count:2}]}));
 s.items=[{index:7,ITID:501,count:8,IsIdentified:1}];receive('ACK_ITEMLIST_BUYING_STORE',{AID:100,UniqueID:125,limitZeny:200,itemList:[{ITID:501,count:3,price:10}]});[mode,offers,submit]=s.open.mock.calls.at(-1);expect(mode).toBe('sell');expect(offers[0]).toMatchObject({index:7,qty:3});submit([{index:7,ITID:501,count:2}]);expect(s.send).toHaveBeenLastCalledWith(expect.objectContaining({AID:100,UniqueID:125,itemList:[{index:7,ITID:501,count:2}]}));receive('ITEM_DELETE_BUYING_STORE',{index:7,count:2,zeny:10});expect(s.remove).toHaveBeenCalledExactlyOnceWith(7,2);expect(s.store.append).not.toHaveBeenCalled();
});
