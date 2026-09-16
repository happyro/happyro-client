import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const world = vi.hoisted(() => ({ map: 'prontera', loading: false }));
vi.mock('Renderer/MapRenderer.js', () => ({
	default: {
		get loading() {
			return world.loading;
		}
	}
}));
vi.mock('Engine/SessionStorage.js', () => ({ default: { NavigationTeleportAllowed: true } }));
vi.mock('../../src/UI/Components/GameTools/AdventureControlService.js', () => ({ searchAdventureNpcs: vi.fn() }));
vi.mock('../../src/UI/Components/GameTools/AdventureActionService.js', () => ({
	getCurrentAdventureMap: () => world.map,
	getAdventureActionState: () => ({ canTeleport: true }),
	subscribeAdventureActions: () => () => {},
	teleportToNpc: vi.fn()
}));
vi.mock('../../src/UI/Components/GameTools/WorldAssetService.js', () => ({
	loadNpcAssets: async () => ({}),
	npcAtlasStyle: () => '',
	loadCatalogMap: async () => null
}));
vi.mock('../../src/UI/Components/GameTools/WorldMapPreview.js', () => ({ drawWorldMapPreview: vi.fn() }));
vi.mock('../../src/UI/Components/GameTools/NpcAvailabilityService.js', () => ({ requestNpcAvailability: vi.fn() }));
import tab from '../../src/UI/Components/GameTools/NpcCatalogTab.js';
import { searchAdventureNpcs } from '../../src/UI/Components/GameTools/AdventureControlService.js';
import { requestNpcAvailability } from '../../src/UI/Components/GameTools/NpcAvailabilityService.js';
let root, cleanup;
const row = (map) => ({ id: map, map, x: 1, y: 1, display_name: map, navigation: { class: 687 } });
beforeEach(async () => {
	vi.useFakeTimers();
	vi.clearAllMocks();
	world.map = 'prontera';
	world.loading = false;
	searchAdventureNpcs.mockImplementation(async ({ onMap, query }) => ({
		data: query === 'absent' ? [] : [row(onMap || world.map)],
		total: query === 'absent' ? 0 : 1
	}));
	requestNpcAvailability.mockResolvedValue([true]);
	root = document.createElement('div');
	document.body.append(root);
	cleanup = tab.mount(root);
	await vi.advanceTimersByTimeAsync(0);
});
afterEach(() => {
	cleanup();
	root.remove();
	vi.useRealTimers();
});
describe('NPC catalog refresh', () => {
	it('follows current-map scope after loading and rechecks the new NPC', async () => {
		world.map = 'geffen';
		world.loading = true;
		await vi.advanceTimersByTimeAsync(500);
		expect(searchAdventureNpcs).toHaveBeenCalledTimes(1);
		world.loading = false;
		await vi.advanceTimersByTimeAsync(500);
		expect(searchAdventureNpcs).toHaveBeenLastCalledWith(
			expect.objectContaining({ onMap: 'geffen', currentMap: 'geffen', page: 1 })
		);
		expect(root.querySelector('.catalog-heading h3').textContent).toBe('geffen');
		expect(requestNpcAvailability).toHaveBeenCalledTimes(2);
	});
	it('clears details and actions as soon as a new search starts, including empty results', async () => {
		const input = root.querySelector('.catalog-search');
		input.value = 'absent';
		input.dispatchEvent(new Event('input'));
		await vi.advanceTimersByTimeAsync(250);
		expect(root.querySelectorAll('.catalog-row')).toHaveLength(0);
		expect(root.querySelector('.catalog-teleport')).toBeNull();
		expect(root.querySelector('.catalog-detail').textContent).toBe('选择一个 NPC 查看详情');
	});
	it('does not reuse an old availability response for a new selection', async () => {
		let resolveOld;
		requestNpcAvailability.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					resolveOld = resolve;
				})
		);
		world.map = 'geffen';
		await vi.advanceTimersByTimeAsync(500);
		requestNpcAvailability.mockResolvedValueOnce([false]);
		world.map = 'payon';
		await vi.advanceTimersByTimeAsync(500);
		resolveOld([true]);
		await vi.advanceTimersByTimeAsync(0);
		expect(root.querySelector('.catalog-heading h3').textContent).toBe('payon');
		expect(root.querySelector('.catalog-teleport').disabled).toBe(true);
	});
});

it('preserves empty scope across map changes until the user views all', async () => {
 searchAdventureNpcs.mockImplementation(async ({ onMap }) => ({ data: onMap ? [] : [row('prontera')], total: onMap ? 0 : 1 }));
 world.map = 'empty';
 await vi.advanceTimersByTimeAsync(500);
 const scope = root.querySelector('.catalog-scope-filter');
 expect(scope.checked).toBe(true);
 expect(root.querySelectorAll('.catalog-row')).toHaveLength(0);
 root.querySelector('.catalog-empty-state button').click();
 await vi.advanceTimersByTimeAsync(0);
 expect(scope.checked).toBe(false);
 expect(root.querySelectorAll('.catalog-row')).toHaveLength(1);
 scope.checked = true; scope.dispatchEvent(new Event('change'));
 await vi.advanceTimersByTimeAsync(0);
 expect(scope.checked).toBe(true);
 expect(root.querySelectorAll('.catalog-row')).toHaveLength(0);
 const search = root.querySelector('.catalog-search');
 search.value = 'missing'; search.dispatchEvent(new Event('input'));
 await vi.advanceTimersByTimeAsync(250);
 world.map = 'another_empty';
 await vi.advanceTimersByTimeAsync(500);
 expect(scope.checked).toBe(true);
 expect(search.value).toBe('missing');
});
it('keeps current-map scope on initial empty load', async () => {
 cleanup();
 searchAdventureNpcs.mockImplementation(async ({ onMap }) => ({ data: onMap ? [] : [row('prontera')], total: onMap ? 0 : 1 }));
 cleanup = tab.mount(root);
 await vi.advanceTimersByTimeAsync(0);
 expect(root.querySelector('.catalog-scope-filter').checked).toBe(true);
 expect(root.querySelectorAll('.catalog-row')).toHaveLength(0);
});
