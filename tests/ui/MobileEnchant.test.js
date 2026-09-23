import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({items:[],send:vi.fn(),session:{Playing:true,zeny:1000,Entity:{action:0,ACTION:{DIE:99}}},group:null}));
vi.mock('Engine/SessionStorage.js',()=>({default:state.session}));
vi.mock('Network/NetworkManager.js',()=>({default:{sendPacket:state.send}}));
vi.mock('Network/PacketStructure.js',()=>({default:{CZ:Object.fromEntries(['REQUEST_RANDOM_ENCHANT','REQUEST_PERFECT_ENCHANT','REQUEST_UPGRADE_ENCHANT','REQUEST_RESET_ENCHANT','CLOSE_UI_ENCHANT'].map(type=>[type,class {constructor(){this.type=type;}}]))}}));
vi.mock('UI/Components/Inventory/Inventory.js',()=>({default:{getUI:()=>({list:state.items,getItemByIndex:index=>state.items.find(item=>item.index===index)})}}));
vi.mock('UI/Game/GameInventory.js',()=>({createGameInventory:()=>({snapshot:()=>state.items.map(item=>({index:item.index,ID:item.ITID,worn:!!item.WearState}))})}));
vi.mock('DB/DBManager.js',()=>({default:{getEnchantGroup:()=>state.group,getItemInfo:id=>({slotCount:0,identifiedDisplayName:`物品${id}`}),getBasefromItemID:id=>String(id),getItemIdfromBase:base=>Number(base),getMessage:()=> '^FF0000附魔结果^000000'}}));
import {openGameEnchant,finishGameEnchant} from '../../src/UI/Game/GameEnchant.js';
import {clearInteraction,interactionSnapshot} from '../../src/UI/Game/ServerInteraction.js';
beforeEach(()=>{clearInteraction();vi.clearAllMocks();state.session.zeny=1000;state.items=[{index:2,ITID:1201,RefiningLevel:7,enchantgrade:0,slot:{card1:0},IsIdentified:true},{index:3,ITID:501,count:3}];state.group={targetItems:[{id:1201}],condition:{minRefine:0,minGrade:0},allowRandomOption:true,slotOrder:[0],slots:{0:{random:{0:[{id:4001}]},successRate:100000,require:{zeny:100,materials:[{id:501,count:2}]} }},reset:{enabled:true,rate:100000,zeny:100,materials:[]}};});
function ready(){const service=openGameEnchant(123);service.setOperationGuard(()=>true);service.select(2,1201);return service;}
it('rechecks selected equipment identity and costs and locks duplicate requests',()=>{
 const service=ready(),choice=service.snapshot().choices[0],signature=JSON.stringify(choice);
 state.items[0].RefiningLevel=8;expect(service.confirm(choice.key,signature)).toContain('变化');state.items[0].RefiningLevel=7;state.items[1].count=1;expect(service.confirm(choice.key,signature)).toContain('不足');state.items[1].count=3;
 expect(service.confirm(choice.key,signature)).toBe('');expect(service.confirm(choice.key,signature)).toContain('不能');expect(state.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({type:'REQUEST_RANDOM_ENCHANT',enchant_group:123,index:2}));expect(state.items[0].slot.card1).toBe(0);
});
it('ends the server session after result and offers only a closeable result, preserving authoritative enchant',()=>{
 const service=ready(),choice=service.snapshot().choices[0];service.confirm(choice.key,JSON.stringify(choice));expect(finishGameEnchant({msgId:3857,ITID:4001})).toBe(true);expect(state.items[0].slot.card1).toBe(4001);expect(interactionSnapshot().kind).toBe('information');expect(service.select(2,1201)).toContain('不能');expect(finishGameEnchant({msgId:3857,ITID:4002})).toBe(false);interactionSnapshot().close();expect(state.send).toHaveBeenCalledOnce();
});
it('does not apply a late enchant to a replacement item at the same index',()=>{
 const service=ready(),choice=service.snapshot().choices[0];service.confirm(choice.key,JSON.stringify(choice));state.items[0]={...state.items[0],ITID:1202};finishGameEnchant({msgId:3857,ITID:4001});expect(state.items[0].slot.card1).toBe(0);
});
it('sends the reset request without changing slots until success',()=>{
 state.items[0].slot.card1=4001;const service=ready(),choice=service.snapshot().choices.find(row=>row.key==='reset');service.confirm('reset',JSON.stringify(choice));expect(state.send).toHaveBeenLastCalledWith(expect.objectContaining({type:'REQUEST_RESET_ENCHANT',index:2,enchant_group:123}));expect(state.items[0].slot.card1).toBe(4001);finishGameEnchant({msgId:3857,ITID:0});expect(state.items[0].slot.card1).toBe(0);
});
it('uses the chosen item ID for perfect enchant and the existing slot for upgrade',()=>{
 state.group.slots[0].perfect={chosen:{id:4002,zeny:100,materials:[{id:501,count:1}]}};
 let service=ready(),choice=service.snapshot().choices.find(row=>row.action==='perfect');
 expect(service.confirm(choice.key,JSON.stringify(choice))).toBe('');expect(state.send).toHaveBeenLastCalledWith(expect.objectContaining({type:'REQUEST_PERFECT_ENCHANT',ITID:4002,index:2,enchant_group:123}));finishGameEnchant({msgId:3857,ITID:4002});
 state.group.slots[0].upgrade={'4002':{result:{id:4003},zeny:100,materials:[{id:501,count:2}]}};
 service=ready();choice=service.snapshot().choices.find(row=>row.action==='upgrade');expect(service.confirm(choice.key,JSON.stringify(choice))).toBe('');expect(state.send).toHaveBeenLastCalledWith(expect.objectContaining({type:'REQUEST_UPGRADE_ENCHANT',slot:0,index:2,enchant_group:123}));finishGameEnchant({msgId:3857,ITID:4003});expect(state.items[0].slot.card1).toBe(4003);
});
