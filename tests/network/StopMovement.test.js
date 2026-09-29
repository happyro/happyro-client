import { expect, it } from 'vitest';
import PACKET from '../../src/Network/PacketStructure.js';

it('encodes a stop request without trusting any client-provided position', () => {
	const buffer = new PACKET.CZ.HAPPYRO_STOP_MOVE().build().buffer;
	expect(Array.from(new Uint8Array(buffer))).toEqual([0x03, 0x0d]);
});
