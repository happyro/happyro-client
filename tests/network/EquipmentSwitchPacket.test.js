import { expect, it } from 'vitest';
import PACKET from '../../src/Network/PacketStructure.js';
import BinaryReader from '../../src/Utils/BinaryReader.js';

it('decodes switch slots under the location field used by inventory and preserves the following permission packet', () => {
 const bytes = new ArrayBuffer(20);
 const view = new DataView(bytes);
 view.setUint16(0, 2, true);
 view.setUint32(2, 0x2, true);
 view.setUint16(6, 3, true);
 view.setUint32(8, 0x100000, true);
 view.setUint32(12, 1000, true);
 view.setUint32(16, 1, true);
 const reader = new BinaryReader(bytes);
 const equipment = new PACKET.ZC.SEND_SWAP_EQUIPITEM_INFO(reader, 12);
 expect(equipment.ItemInfo).toEqual([{index: 2, location: 0x2}, {index: 3, location: 0x100000}]);
 const config = new PACKET.ZC.CONFIG(reader, 20);
 expect(config.Config).toBe(1000);
 expect(config.Value).toBe(1);
 expect(reader.tell()).toBe(20);
});
