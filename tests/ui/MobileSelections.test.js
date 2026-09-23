import {beforeEach,expect,it,vi} from 'vitest';
const s=vi.hoisted(()=>({items:[],session:{Playing:true,Entity:{action:0,ACTION:{DIE:99}}},send:vi.fn(),cancel:vi.fn()}));
vi.mock('Engine/SessionStorage.js',()=>({default:s.session}));
vi.mock('UI/Components/Inventory/Inventory.js',()=>({default:{getUI:()=>({list:s.items,getItemByIndex:index=>s.items.find(item=>item.index===index)})}}));
vi.mock('UI/Game/GameInventory.js',()=>({createGameInventory:()=>({snapshot:()=>s.items.map(item=>({index:item.index,ID:item.ITID,count:item.count,name:'材料',worn:!!item.worn})),describe:item=>({name:'物品',count:item.count})})}));
vi.mock('DB/DBManager.js',()=>({default:{INTERFACE_PATH:'',getItemName:()=> '材料',getSkillDescription:()=> '说明'}}));
vi.mock('Core/Client.js',()=>({default:{loadFile:vi.fn()}}));
vi.mock('DB/Skills/SkillInfo.generated.js',()=>({default:{1:{SkillName:'技能',Name:'skill'}}}));
import {openGameSelection,selectionEntries} from '../../src/UI/Game/GameSelection.js';
import {openGameMaterials} from '../../src/UI/Game/GameMaterials.js';
import {interactionSnapshot,clearInteraction} from '../../src/UI/Game/ServerInteraction.js';
import {createSelectionPanel} from '../../src/UI/Mobile/game/SelectionPanel.js';
beforeEach(()=>{vi.clearAllMocks();clearInteraction();s.session.Playing=true;s.session.Entity.action=0;s.items=[{index:2,ITID:1000,count:2},{index:3,ITID:994,count:1}];});
it('checks inventory identity, modal ownership and single submission, including explicit cancellation',()=>{
 let service=openGameSelection('鉴定',selectionEntries([2],'inventory'),s.send,s.cancel);service.setOperationGuard(()=>true);
 s.items[0].ITID=1001;expect(service.choose(2)).toContain('变化');expect(s.send).not.toHaveBeenCalled();interactionSnapshot().close();expect(s.cancel).toHaveBeenCalledOnce();expect(service.choose(2)).toContain('不能');
 service=openGameSelection('技能',selectionEntries([1],'skill'),s.send,s.cancel);service.setOperationGuard(()=>true);service.choose(1);service.choose(1);expect(s.send).toHaveBeenCalledExactlyOnceWith(1);
});
it('validates smithing quantities and disallows multiple elemental stones without changing inventory',()=>{
 const service=openGameSelection('锻造',[{id:10,name:'武器',materials:true}],s.send,s.cancel);service.setOperationGuard(()=>true);
 service.choose(10,[1000,1000,1000]);service.choose(10,[994,994]);expect(s.send).not.toHaveBeenCalled();service.choose(10,[994,1000,1000]);expect(s.send).toHaveBeenCalledExactlyOnceWith(10,[{ITID:994},{ITID:1000},{ITID:1000}]);expect(s.items[0].count).toBe(2);
});
it('material conversion preserves source counts, rejects worn/stale quantities and sends cancel separately',()=>{
 const service=openGameMaterials(2,s.send);service.setOperationGuard(()=>true);expect(service.set(2,1000,3)).toContain('变化');expect(service.set(2,1000,2)).toBe('');s.items[0].count=1;expect(service.confirm()).toContain('变化');s.items[0].count=2;expect(service.confirm()).toBe('');service.confirm();expect(s.send).toHaveBeenCalledExactlyOnceWith({Type:2,Action:1,MaterialList:[{index:2,count:2}]});expect(s.items[0].count).toBe(2);
 openGameMaterials(1,s.send);interactionSnapshot().close();expect(s.send).toHaveBeenLastCalledWith({Type:1,Action:0,MaterialList:[]});
});
it('keeps an explicit choice and confirmation rather than submitting the first entry',()=>{
 const body=document.createElement('div'),service=openGameSelection('选择',[{id:7,name:'<script>测试</script>'}],s.send,s.cancel);service.setOperationGuard(()=>true);createSelectionPanel(body,service);expect(s.send).not.toHaveBeenCalled();expect(body.querySelector('script')).toBeNull();body.querySelector('.inventory-item').click();[...body.querySelectorAll('button')].find(b=>b.textContent==='确认选择').click();expect(s.send).toHaveBeenCalledOnce();
});
it('detects in-place equipment slot changes after opening an inventory selection',()=>{
 s.items[0].slot={card1:0};const service=openGameSelection('精炼',selectionEntries([2],'inventory'),s.send,s.cancel);service.setOperationGuard(()=>true);s.items[0].slot.card1=4001;expect(service.choose(2)).toContain('变化');expect(s.send).not.toHaveBeenCalled();
});
