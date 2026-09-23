import {beforeEach,expect,it,vi} from 'vitest';
const s=vi.hoisted(()=>({items:[],reserved:[],session:{Playing:true,Entity:{action:0,ACTION:{DIE:99}}},add:vi.fn(),remove:vi.fn(),swap:vi.fn()}));
vi.mock('Engine/SessionStorage.js',()=>({default:s.session}));
vi.mock('UI/Components/Inventory/Inventory.js',()=>({default:{getUI:()=>({equipswitchlist:s.reserved})}}));
vi.mock('UI/Components/SwitchEquip/SwitchEquip.js',()=>({default:{onAddSwitchEquip:s.add,onRemoveSwitchEquip:s.remove,RequestSwitch:s.swap}}));
vi.mock('UI/Game/GameInventory.js',()=>({createGameInventory:()=>({snapshot:()=>s.items})}));
vi.mock('UI/Game/GameEquipment.js',()=>({equipmentSlots:[{label:'左饰品',location:8},{label:'右饰品',location:128}]}));
import {createGameEquipmentSets,notifyEquipmentSetResult} from '../../src/UI/Game/GameEquipmentSets.js';
import {createEquipmentSetsPanel} from '../../src/UI/Mobile/game/EquipmentSetsPanel.js';
beforeEach(()=>{vi.clearAllMocks();s.session.Playing=true;s.items=[{index:2,ID:2601,name:'饰品',location:136,category:'equipment',identified:true,damaged:false,worn:false}];s.reserved=[];});
it('uses a single chosen location, rejects stale identities and locks until server acknowledgement',()=>{
 const service=createGameEquipmentSets(()=>true);service.act(2,2602,8,'add');service.act(2,2601,136,'add');expect(s.add).not.toHaveBeenCalled();service.act(2,2601,128,'add');service.act(2,2601,128,'add');expect(s.add).toHaveBeenCalledExactlyOnceWith(2,128);expect(s.reserved).toHaveLength(0);expect(service.snapshot().allowed).toBe(false);
 s.reserved=[{index:2,location:128}];notifyEquipmentSetResult();expect(service.snapshot().items[0].registeredLocation).toBe(128);service.act(2,2601,128,'remove');expect(s.remove).toHaveBeenCalledExactlyOnceWith(2);expect(s.reserved).toHaveLength(1);
});
it('releases a rejected request on acknowledgement and refuses worn or disconnected actions',()=>{
 const service=createGameEquipmentSets(()=>true);service.act(2,2601,8,'add');notifyEquipmentSetResult();expect(service.snapshot().allowed).toBe(true);s.items[0].worn=true;expect(service.act(2,2601,8,'add')).toContain('变化');s.items[0].worn=false;s.session.Playing=false;expect(service.act(2,2601,8,'add')).toContain('变化');expect(s.add).toHaveBeenCalledOnce();
});
it('requires a nonempty scheme and throttles repeated switches',()=>{
 const service=createGameEquipmentSets(()=>true);service.swap();expect(s.swap).not.toHaveBeenCalled();s.reserved=[{index:2,location:8}];service.swap();service.swap();expect(s.swap).toHaveBeenCalledOnce();
});
it('updates the picker when the server replaces an item at the same index, and confirms swap explicitly',()=>{
 const body=document.createElement('div'),service=createGameEquipmentSets(()=>true),panel=createEquipmentSetsPanel(body,service);body.querySelector('.inventory-item').click();s.items[0]={...s.items[0],ID:2602,name:'新饰品'};panel.update();body.querySelector('.inventory-detail button').click();expect(s.add).toHaveBeenCalledExactlyOnceWith(2,8);s.reserved=[{index:2,location:8}];notifyEquipmentSetResult();panel.update();body.querySelector('[data-swap]').click();expect(s.swap).not.toHaveBeenCalled();body.querySelector('[data-swap]').click();expect(s.swap).toHaveBeenCalledOnce();
});
