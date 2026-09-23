import {it,expect} from 'vitest';
import PACKET from '../../src/Network/PacketStructure.js';
import BinaryReader from '../../src/Utils/BinaryReader.js';
it('reads the full 64-bit bank balance before the query reason',()=>{const bytes=new ArrayBuffer(10),view=new DataView(bytes);view.setUint32(0,123456,true);view.setUint32(4,0,true);view.setUint16(8,7,true);const reader=new BinaryReader(bytes),p=new PACKET.ZC.BANKING_CHECK(reader);expect(p.money).toBe(123456);expect(p.reason).toBe(7);expect(reader.tell()).toBe(10);});
