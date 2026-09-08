import { afterEach, describe, expect, it, vi } from 'vitest';
import Session from '../../src/Engine/SessionStorage.js';
import {
	loadAdventureControlBootstrap,
	maintainCurrentCharacter
} from '../../src/UI/Components/GameTools/AdventureControlService.js';

describe('adventure control service', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('creates a UUID idempotency key without crypto.randomUUID', async () => {
		Session.AID = 2000001;
		Session.GID = 150002;
		Session.WebToken = 'session-token';
		vi.stubGlobal('crypto', {
			getRandomValues(bytes) {
				bytes.forEach((_, index) => (bytes[index] = index));
				return bytes;
			}
		});
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ data: { char_id: 150002 } })
		});
		vi.stubGlobal('fetch', fetchMock);

		await maintainCurrentCharacter('character.vitals.restore', {});

		const [url, options] = fetchMock.mock.calls[0];
		const body = JSON.parse(options.body);
		expect(url).toBe('/api/adventure-tools/character/commands');
		expect(body.idempotency_key).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
		expect(options.headers['X-HappyRO-Auth-Token']).toBe('session-token');
	});

	it('loads session capabilities through the same authenticated endpoint', async () => {
		Session.AID = 2000001;
		Session.GID = 150002;
		Session.WebToken = 'session-token';
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ data: { gameSettingsAllowed: true } })
		});
		vi.stubGlobal('fetch', fetchMock);

		await expect(loadAdventureControlBootstrap()).resolves.toEqual({ gameSettingsAllowed: true });
		expect(fetchMock.mock.calls[0][0]).toBe('/api/adventure-tools/bootstrap');
		expect(fetchMock.mock.calls[0][1].headers['X-HappyRO-Account-ID']).toBe('2000001');
	});
});
