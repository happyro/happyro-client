import {expect,it} from 'vitest';
import PACKET from '../../src/Network/PacketStructure.js';
import BinaryReader from '../../src/Utils/BinaryReader.js';
it('reads the 20211103 buying store update with a 32-bit item ID and all receipt fields',()=>{
 const buffer=new ArrayBuffer(22),view=new DataView(buffer);
 view.setUint32(0,100000,true);view.setUint16(4,25,true);view.setUint32(6,500,true);view.setUint32(10,1500,true);view.setUint32(14,12345,true);view.setUint32(18,1700000000,true);
 const reader=new BinaryReader(buffer),packet=new PACKET.ZC.UPDATE_ITEM_FROM_BUYING_STORE2(reader);
 expect(packet).toMatchObject({ITID:100000,count:25,zeny:500,limitZeny:1500,GID:12345,date:1700000000});expect(reader.tell()).toBe(22);expect(PACKET.ZC.UPDATE_ITEM_FROM_BUYING_STORE2.size).toBe(24);
});
