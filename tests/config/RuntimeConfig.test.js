import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, test } from 'vitest';

const configSource = fs.readFileSync(path.resolve('applications/pwa/Config.happyro.js'), 'utf8');

function loadConfig(runtimeConfig = {}) {
	const window = {
		location: {
			host: 'happyro.example.com',
			origin: 'https://happyro.example.com',
			protocol: 'https:'
		},
		ROConfigRuntime: runtimeConfig
	};
	vm.runInNewContext(configSource, { window });
	return window.ROConfigHappyRO;
}

describe('HappyRO runtime endpoints', () => {
	test('uses the current page origin by default', () => {
		const config = loadConfig();

		expect(config.remoteClient).toBe('https://happyro.example.com/');
		expect(config.servers[0].socketProxy).toBe('wss://happyro.example.com/ws/');
	});

	test('allows resource and WebSocket endpoints to be configured independently', () => {
		const config = loadConfig({
			remoteClient: 'https://happyro-static.example.com/',
			socketProxy: 'wss://ws.example.com/ws/'
		});

		expect(config.remoteClient).toBe('https://happyro-static.example.com/');
		expect(config.servers[0].socketProxy).toBe('wss://ws.example.com/ws/');
	});
});
