import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('game tools tab registry', () => {
	beforeEach(() => vi.resetModules());

	it('registers valid tabs in insertion order', async () => {
		const registry = await import('../../src/UI/Components/GameTools/GameToolsRegistry.js');
		const tab = { id: 'monsters', label: '魔物图鉴', mount: () => undefined };
		registry.registerGameToolsTab(tab);
		expect(registry.getGameToolsTabs()).toEqual([tab]);
	});

	it('rejects duplicate and incomplete tabs', async () => {
		const registry = await import('../../src/UI/Components/GameTools/GameToolsRegistry.js');
		registry.registerGameToolsTab({ id: 'monsters', label: '魔物图鉴', mount: () => undefined });
		expect(() => registry.registerGameToolsTab({ id: 'monsters', label: '重复', mount: () => undefined })).toThrow();
		expect(() => registry.registerGameToolsTab({ id: 'missing' })).toThrow(TypeError);
	});
});
