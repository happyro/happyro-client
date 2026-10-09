import { expect, it, vi } from 'vitest';
vi.mock('DB/DBManager.js', () => ({ default: { getItemInfo: id => id === 100 ? {slotCount:2} : {identifiedDisplayName:`效果${id}`,identifiedDescriptionName:['^FF0000效果说明','第二行']} } }));
import { equipmentSockets } from '../../src/UI/Game/EquipmentSockets.js';
const item={ITID:100,IsIdentified:true,slot:{card1:4001,card2:4001,card3:0,card4:4700}};
it('preserves duplicate cards and physical enchant slot positions',()=>{
 const result=equipmentSockets(item);
 expect(result.map(({id,slot,kind})=>({id,slot,kind}))).toEqual([{id:4001,slot:1,kind:'card'},{id:4001,slot:2,kind:'card'},{id:4700,slot:4,kind:'enchant'}]);
 expect(result[0].description).toBe('效果说明\n第二行');
});
it('does not expose unidentified or forged ownership fields as cards',()=>{
 expect(equipmentSockets({...item,IsIdentified:false})).toEqual([]);
 for(const marker of [254,255,256])expect(equipmentSockets({...item,slot:{...item.slot,card1:marker}})).toEqual([]);
 expect(equipmentSockets({...item,slot:null})).toEqual([]);
});
