import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
vi.mock('Network/NetworkManager.js', () => ({ default: {} }));
vi.mock('Network/PacketStructure.js', () => ({ default: {} }));
vi.mock('Engine/SessionStorage.js', () => ({ default: {} }));
vi.mock('DB/DBManager.js', () => ({ default: { listNavigation: async () => [] } }));
vi.mock('../../src/UI/Components/GameTools/AdventureActionService.js', () => ({
	getCurrentAdventureMap: () => 'prontera',
	getAdventureActionState: () => ({}),
	subscribeAdventureActions: () => () => {},
	teleportToMap: vi.fn()
}));
import tab from '../../src/UI/Components/GameTools/MonsterCatalogTab.js';
let root, cleanup;
afterEach(() => {
	cleanup?.();
	root?.remove();
	vi.unstubAllGlobals();
});
it('shows an error then recovers drop details by retrying without reloading the catalog', async () => {
	const catalog = JSON.parse(readFileSync('applications/pwa/data/monsters/catalog.json'));
	catalog.monsters = catalog.monsters.filter((monster) => monster.id === 1002);
	const drops = JSON.parse(readFileSync('applications/pwa/data/monsters/drops.json'));
	let dropCalls = 0,
		catalogCalls = 0;
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url) => {
			if (String(url).endsWith('/drops.json')) {
				if (++dropCalls === 1) throw new Error('offline');
				return { ok: true, json: async () => drops };
			}
			catalogCalls++;
			return { ok: true, json: async () => catalog };
		})
	);
	root = document.createElement('div');
	document.body.append(root);
	cleanup = tab.mount(root);
 root.querySelector('.catalog-scope-filter').checked = false;
	await vi.waitFor(() => expect(root.querySelector('.monster-drops-retry')).not.toBeNull());
	expect(root.querySelector('.monster-drops').textContent).toContain('掉落资料加载失败');
	root.querySelector('.monster-drops-retry').click();
	await vi.waitFor(() => expect(root.querySelector('.monster-drops').textContent).toContain('杰勒比结晶'));
	expect(dropCalls).toBe(2);
	expect(catalogCalls).toBe(1);
});
