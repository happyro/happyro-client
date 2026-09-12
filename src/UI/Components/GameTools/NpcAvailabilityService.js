import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import { onConnectionEnd } from 'Network/ConnectionLifecycle.js';

export const NPC_AVAILABILITY_BATCH_SIZE = 50;
export const NPC_AVAILABILITY_ENTRY_BYTES = 24;
export const NPC_AVAILABILITY_HEADER_BYTES = 10;

let nextRequestId = 0x80000000;
const pendingRequests = new Map();

onConnectionEnd(() => {
	for (const pending of pendingRequests.values()) {
		clearTimeout(pending.timer);
		pending.reject(new Error('Game connection ended'));
	}
	pendingRequests.clear();
});

function normalizeNpc(npc) {
	return {
		mapName: String(npc.mapName || '')
			.replace(/\.gat$/i, '')
			.toLocaleLowerCase(),
		x: Math.max(0, Math.floor(npc.x)),
		y: Math.max(0, Math.floor(npc.y)),
		npcClass: Math.floor(npc.npcClass)
	};
}

export function npcAvailabilityPacketLength(count) {
	const n = Math.min(Math.max(0, Number(count) || 0), NPC_AVAILABILITY_BATCH_SIZE);
	return NPC_AVAILABILITY_HEADER_BYTES + n * NPC_AVAILABILITY_ENTRY_BYTES;
}

export function npcAvailabilityBatches(npcs) {
	const list = npcs || [];
	const batches = [];
	for (let index = 0; index < list.length; index += NPC_AVAILABILITY_BATCH_SIZE) {
		batches.push(list.slice(index, index + NPC_AVAILABILITY_BATCH_SIZE));
	}
	return batches;
}

export function requestNpcAvailability(npcs, timeout = 5000) {
	const candidates = npcs.slice(0, NPC_AVAILABILITY_BATCH_SIZE);
	if (pendingRequests.size >= 64) return Promise.reject(new Error('Too many pending NPC requests'));
	do { nextRequestId = (nextRequestId + 1) >>> 0; } while (pendingRequests.has(nextRequestId));
	const requestId = nextRequestId;
	const packet = new PACKET.CZ.HAPPYRO_NPC_AVAILABILITY();
	packet.requestId = requestId;
	packet.npcs = candidates.map(normalizeNpc);

	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			pendingRequests.delete(requestId);
			reject(new Error('NPC availability request timed out'));
		}, timeout);
		pendingRequests.set(requestId, { count: candidates.length, resolve, reject, timer });
		try {
			if (Network.sendPacket(packet) === false) throw new Error('Game connection is not open');
		} catch (error) {
			clearTimeout(timer);
			pendingRequests.delete(requestId);
			reject(error);
		}
	});
}

export function handleNpcAvailabilityResult(packet) {
	const pending = pendingRequests.get(packet.requestId);
	if (!pending || packet.available.length !== pending.count) return false;
	clearTimeout(pending.timer);
	pendingRequests.delete(packet.requestId);
	pending.resolve(packet.available);
	return true;
}
