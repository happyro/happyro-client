import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({items:[],reserved:[],send:vi.fn(),session:{Playing:true,Entity:{action:0,ACTION:{DIE:99}}},
 synthesis:{NeedCount:2,NeedRefineMin:0,NeedRefineMax:10,SourceItems:[{id:501,count:2},{id:502,count:1}]},
 upgrade:{NeedRefineMin:5,NeedRefineMax:10,NeedOptionNumMin:1,NotSocketEnchantItem:true,TargetItems:[{id:1201}]},
 reform:{BaseItemId:1201,NeedRefineMin:5,NeedRefineMax:10,NeedOptionNumMin:1,IsEmptySocket:true,ResultItemId:1202,ChangeRefineValue:-2,PreserveGrade:false,PreserveSocketItem:false,Materials:[{MaterialItemID:501,Amount:2}]}
}));
vi.mock('Engine/SessionStorage.js',()=>({default:state.session}));
vi.mock('Network/NetworkManager.js',()=>({default:{sendPacket:state.send}}));
vi.mock('Network/PacketStructure.js',()=>({default:{CZ:Object.fromEntries(['RANDOM_COMBINE_ITEM_UI_CLOSE','RANDOM_UPGRADE_ITEM_UI_CLOSE','CLOSE_REFORM_UI','REQ_RANDOM_COMBINE_ITEM','REQ_RANDOM_UPGRADE_ITEM','ITEM_REFORM'].map(type=>[type,class {constructor(){this.type=type;}}]))}}));
vi.mock('UI/Components/Inventory/Inventory.js',()=>({default:{getUI:()=>({list:state.items,equipswitchlist:state.reserved,getItemByIndex:index=>state.items.find(item=>item.index===index)})}}));
vi.mock('UI/Game/GameInventory.js',()=>({createGameInventory:()=>({snapshot:()=>state.items.map(item=>({index:item.index,ID:item.ITID,name:'物品',count:item.count}))})}));
vi.mock('DB/DBManager.js',()=>({default:{getLaphineSysInfoById:()=>state.synthesis,getLaphineUpgInfoById:()=>state.upgrade,findReformListByItemID:()=>[1],getAllReformInfos:()=>[state.reform],getItemName:item=>`物品${item.ITID}`}}));
import {openItemTransformation,finishItemTransformation,transformationMatches} from '../../src/UI/Game/GameItemTransformation.js';
import {clearInteraction,interactionSnapshot} from '../../src/UI/Game/ServerInteraction.js';
beforeEach(()=>{clearInteraction();vi.clearAllMocks();state.reserved=[];state.session.Playing=true;state.items=[{index:2,ITID:501,count:3,IsIdentified:true},{index:3,ITID:502,count:1,IsIdentified:true},{index:4,ITID:1201,count:1,IsIdentified:true,RefiningLevel:7,enchantgrade:1,slot:{card1:0},Options:[{index:1}]},{index:5,ITID:10000,count:1,IsIdentified:true}];});
function open(kind){const service=openItemTransformation(kind,10000);service.setOperationGuard(()=>true);return service;}
it('requires the distinct synthesis entries and exact recipe quantities, without optimistic consumption',()=>{
 const service=open('synthesis');expect(service.set(2,501,1)).toContain('变化');expect(service.set(2,501,2)).toBe('');expect(service.confirm()).toContain('条目数');service.set(3,502,1);state.items[0].count=1;expect(service.confirm()).toContain('变化');state.items[0].count=3;expect(service.confirm()).toBe('');service.confirm();expect(state.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({type:'REQ_RANDOM_COMBINE_ITEM',itemId:10000,items:[{index:2,count:2},{index:3,count:1}]}));expect(state.items[0].count).toBe(3);
 expect(finishItemTransformation('upgrade',{result:0})).toBe(false);expect(finishItemTransformation('synthesis',{result:0})).toBe(true);expect(interactionSnapshot()).toBeNull();
});
it('combines refine/options/socket requirements and rejects reserved or changed upgrade targets',()=>{
 const item=state.items[2];expect(transformationMatches(item,state.upgrade)).toBe(true);item.RefiningLevel=2;expect(transformationMatches(item,state.upgrade)).toBe(false);item.RefiningLevel=7;
 const service=open('upgrade');state.reserved=[{index:4}];expect(service.snapshot().items).toHaveLength(0);state.reserved=[];service.set(4,1201,1);item.slot.card1=4001;expect(service.confirm()).toContain('变化');item.slot.card1=0;expect(service.confirm()).toBe('');expect(state.send).toHaveBeenLastCalledWith(expect.objectContaining({type:'REQ_RANDOM_UPGRADE_ITEM',itemId:10000,item_index:4}));
 interactionSnapshot().close();expect(interactionSnapshot()).toBeNull();expect(finishItemTransformation('upgrade',{result:0})).toBe(false);
});
it('previews reform consequences, checks materials and handles failed result without resending',()=>{
 const service=open('reform');expect(service.snapshot().items[0].description).toContain('物品1202');service.set(4,1201,1);state.items[0].count=1;expect(service.confirm()).toContain('不足');state.items[0].count=3;expect(service.confirm()).toBe('');expect(state.send).toHaveBeenLastCalledWith(expect.objectContaining({type:'ITEM_REFORM',ITID:10000,index:4}));
 expect(finishItemTransformation('reform',{index:2,result:0})).toBe(false);expect(finishItemTransformation('reform',{index:4,result:1})).toBe(true);expect(service.snapshot().allowed).toBe(true);expect(service.snapshot().message).toContain('未完成');expect(state.send).toHaveBeenCalledOnce();
});
it('does not let an old close affect the replacement modal and sends the current close exactly once',()=>{
 open('upgrade');const old=interactionSnapshot();open('synthesis');old.close();expect(state.send).not.toHaveBeenCalled();const current=interactionSnapshot();current.close();current.close();expect(state.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({type:'RANDOM_COMBINE_ITEM_UI_CLOSE'}));
});
