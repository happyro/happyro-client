import { expect, it } from 'vitest';
import PACKET from '../../src/Network/PacketStructure.js';

it('encodes the complete 16-bit trait increment and keeps ordinary increments 8-bit', () => {
	const packet = new PACKET.CZ.STATUS_CHANGE();
	packet.statusID = 219;
	packet.changeAmount = 300;
	expect([...new Uint8Array(packet.build().buffer)]).toEqual([0x24, 0x0b, 219, 0, 44, 1]);
	packet.statusID = 13;
	packet.changeAmount = 1;
	expect([...new Uint8Array(packet.build().buffer)]).toEqual([0xbb, 0, 13, 0, 1]);
});
