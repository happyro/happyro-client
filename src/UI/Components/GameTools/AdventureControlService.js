import Session from 'Engine/SessionStorage.js';

function headers() {
	return {
		Accept: 'application/json',
		'Content-Type': 'application/json',
		'X-HappyRO-Account-ID': String(Session.AID),
		'X-HappyRO-Character-ID': String(Session.GID),
		'X-HappyRO-Auth-Token': Session.WebToken || ''
	};
}

async function request(path, options = {}) {
	const response = await fetch(`/api/adventure-tools${path}`, { ...options, headers: headers() });
	const body = await response.json().catch(() => ({}));
	if (!response.ok) {
		const validation = body.errors ? Object.values(body.errors).flat()[0] : null;
		throw new Error(validation || body.message || body.error?.message || '操作失败，请稍后重试');
	}
	return body.data;
}

function createIdempotencyKey() {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function loadAdventureControlBootstrap() {
	return request('/bootstrap');
}

export function loadCurrentCharacter() {
	return request('/character');
}

export function maintainCurrentCharacter(type, payload) {
	return request('/character/commands', {
		method: 'POST',
		body: JSON.stringify({ idempotency_key: createIdempotencyKey(), type, payload })
	});
}

export function loadAdventureGameRules() {
	return request('/game-rules');
}

export function applyAdventureGameRules(changes, reason) {
	return request('/game-rules', {
		method: 'PUT',
		body: JSON.stringify({ changes, reason })
	});
}
