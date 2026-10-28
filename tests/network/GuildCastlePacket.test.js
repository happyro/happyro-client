import { expect, it } from 'vitest';
import PACKET from '../../src/Network/PacketStructure.js';
import BinaryReader from '../../src/Utils/BinaryReader.js';

it.each([[], [1], [1, 20, 30, 40], [0, 128, 255]].map(ids => ({ ids })))('decodes castle IDs as bytes without text decoding: $ids', ({ ids }) => {
 const buffer = new Uint8Array(ids).buffer;
 const reader = new BinaryReader(buffer);
 const packet = new PACKET.ZC.GUILD_AGIT_INFO(reader, buffer.byteLength);
 expect(packet.castle_list).toEqual(ids);
 expect(reader.tell()).toBe(buffer.byteLength);
});
