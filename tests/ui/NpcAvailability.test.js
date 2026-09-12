import { afterEach, describe, expect, it, vi } from 'vitest';
import Network from '../../src/Network/NetworkManager.js';
import PACKET from '../../src/Network/PacketStructure.js';
import { endConnection } from '../../src/Network/ConnectionLifecycle.js';
import {
	NPC_AVAILABILITY_BATCH_SIZE,
	npcAvailabilityBatches,
	npcAvailabilityPacketLength,
	requestNpcAvailability,
	handleNpcAvailabilityResult
} from '../../src/UI/Components/GameTools/NpcAvailabilityService.js';

describe('NPC availability packets', () => {
	it('encodes the real wire layout for a 37-NPC request', () => {
		const packet = new PACKET.CZ.HAPPYRO_NPC_AVAILABILITY();
		packet.requestId = 0x81234567;
		packet.npcs = Array.from({ length: 37 }, (_, i) => ({ mapName: 'prontera', x: 150 + i, y: 200, npcClass: 1234 }));
		const buffer = packet.build().buffer;
		const view = new DataView(buffer);
		expect(buffer.byteLength).toBe(898);
		expect(view.getUint16(0, true)).toBe(0xcfa);
		expect(view.getUint16(2, true)).toBe(898);
		expect(view.getUint32(4, true)).toBe(0x81234567);
		expect(view.getUint16(8, true)).toBe(37);
		for (let i = 0; i < 37; i++) {
			const offset = 10 + i * 24;
			expect(Array.from(new Uint8Array(buffer, offset, 16))).toEqual([112,114,111,110,116,101,114,97,0,0,0,0,0,0,0,0]);
			expect(view.getUint16(offset + 16, true)).toBe(150 + i);
			expect(view.getUint16(offset + 18, true)).toBe(200);
			expect(view.getInt32(offset + 20, true)).toBe(1234);
		}
	});
	afterEach(() => { endConnection(); vi.restoreAllMocks(); vi.useRealTimers(); });
	it('registers before sending, even when the response arrives immediately', async () => {
		vi.spyOn(Network, 'sendPacket').mockImplementation(packet => {
			handleNpcAvailabilityResult({ requestId: packet.requestId, available: [true] });
		});
		await expect(requestNpcAvailability([{ mapName: 'prontera', x: 1, y: 1, npcClass: 1 }])).resolves.toEqual([true]);
	});
	it('rejects pending work on disconnect and ignores stale responses', async () => {
		let requestId;
		vi.spyOn(Network, 'sendPacket').mockImplementation(packet => { requestId = packet.requestId; });
		const pending = requestNpcAvailability([]);
		const rejected = expect(pending).rejects.toThrow('connection ended');
		endConnection();
		await rejected;
		expect(handleNpcAvailabilityResult({ requestId, available: [] })).toBe(false);
	});
	it('cleans up failed sends and request timeouts', async () => {
		vi.useFakeTimers();
		const send = vi.spyOn(Network, 'sendPacket').mockImplementation(() => { throw new Error('send failed'); });
		await expect(requestNpcAvailability([])).rejects.toThrow('send failed');
		expect(vi.getTimerCount()).toBe(0);
		send.mockImplementation(() => {});
		const rejected = expect(requestNpcAvailability([], 100)).rejects.toThrow('timed out');
		await vi.advanceTimersByTimeAsync(100);
		await rejected;
		expect(vi.getTimerCount()).toBe(0);
	});
	it('keeps each request at most 50 NPCs and 10 + 24n bytes', () => {
		expect(NPC_AVAILABILITY_BATCH_SIZE).toBe(50);
		expect(npcAvailabilityPacketLength(0)).toBe(10);
		expect(npcAvailabilityPacketLength(1)).toBe(34);
		expect(npcAvailabilityPacketLength(37)).toBe(898);
		expect(npcAvailabilityPacketLength(50)).toBe(1210);
		expect(npcAvailabilityPacketLength(51)).toBe(1210);
	});

	it('splits oversized catalog checks into 50-NPC batches', () => {
		const npcs = Array.from({ length: 73 }, (_, index) => ({ id: index }));
		expect(npcAvailabilityBatches(npcs).map(batch => batch.length)).toEqual([50, 23]);
	});
});
