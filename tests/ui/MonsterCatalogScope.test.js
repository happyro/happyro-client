import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const world = vi.hoisted(() => ({ map: 'prontera' }));
vi.mock('Network/NetworkManager.js', () => ({ default: {} }));
vi.mock('Network/PacketStructure.js', () => ({ default: {} }));
vi.mock('Engine/SessionStorage.js', () => ({ default: {} }));
vi.mock('DB/DBManager.js', () => ({ default: { listNavigation: async () => [] } }));
vi.mock('../../src/UI/Components/GameTools/AdventureActionService.js', () => ({
	getCurrentAdventureMap: () => world.map,
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
 vi.useRealTimers();
});
it('uses Mini and MVP labels and preserves current-map scope until the user views all', async () => {
 vi.useFakeTimers();
 const catalog = JSON.parse(readFileSync('applications/pwa/data/monsters/catalog.json'));
 const drops = JSON.parse(readFileSync('applications/pwa/data/monsters/drops.json'));
 vi.stubGlobal('fetch', vi.fn(async url => ({ok:true, json:async()=>String(url).endsWith('/drops.json') ? drops : catalog})));
 root=document.createElement('div');document.body.append(root);cleanup=tab.mount(root);
 await vi.advanceTimersByTimeAsync(0);
 const scope=root.querySelector('.catalog-scope-filter');
 expect(scope.checked).toBe(true);
 expect(root.querySelector('[data-value=mini]').textContent).toContain('Mini');
 expect(root.querySelector('[data-value=mvp]').textContent).toContain('MVP');
 root.querySelector('.catalog-empty-state button').click();
 expect(scope.checked).toBe(false);
 const search=root.querySelector('.monster-search');
 search.value='1096';search.dispatchEvent(new Event('input'));
 expect(root.querySelector('.monster-badge').textContent).toBe('Mini');
 search.value='1039';search.dispatchEvent(new Event('input'));
 expect(root.querySelector('.monster-badge').textContent).toBe('MVP');
 search.value='';search.dispatchEvent(new Event('input'));
 scope.checked=true;scope.dispatchEvent(new Event('change'));
 expect(scope.checked).toBe(true);
 expect(root.querySelectorAll('.monster-row')).toHaveLength(0);
 world.map='geffen';await vi.advanceTimersByTimeAsync(500);
 expect(scope.checked).toBe(true);
 scope.checked=true;scope.dispatchEvent(new Event('change'));
 search.value='missing';search.dispatchEvent(new Event('input'));
 world.map='payon';await vi.advanceTimersByTimeAsync(500);
 expect(scope.checked).toBe(true);
 expect(search.value).toBe('missing');
});
