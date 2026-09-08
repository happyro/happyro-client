import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';

let nextRequestId = 0x80000000;
const pendingRequests = new Map();

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

export function requestNpcAvailability(npcs, timeout = 5000) {
	const candidates = npcs.slice(0, 50);
	const requestId = ++nextRequestId;
	const packet = new PACKET.CZ.HAPPYRO_NPC_AVAILABILITY();
	packet.requestId = requestId;
	packet.npcs = candidates.map(normalizeNpc);
	Network.sendPacket(packet);

	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			pendingRequests.delete(requestId);
			reject(new Error('NPC availability request timed out'));
		}, timeout);
		pendingRequests.set(requestId, { count: candidates.length, resolve, timer });
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
