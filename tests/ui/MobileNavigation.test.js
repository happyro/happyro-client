import { beforeEach, expect, it, vi } from 'vitest';
const s = vi.hoisted(() => ({ session: {}, map: { currentMap: 'prontera.gat' }, search: vi.fn(), path: vi.fn() }));
vi.mock('DB/DBManager.js', () => ({ default: { searchNavigation: s.search } }));
vi.mock('Engine/SessionStorage.js', () => ({ default: s.session }));
vi.mock('Renderer/MapRenderer.js', () => ({ default: s.map }));
vi.mock('UI/Components/Navigation/MapPathFinder.js', () => ({ default: { findPathBetweenMaps: s.path } }));
import { createGameNavigation } from '../../src/UI/Game/GameNavigation.js';
import { createNavigationPanel } from '../../src/UI/Mobile/game/NavigationPanel.js';
beforeEach(() => {
	vi.clearAllMocks(); s.map.currentMap = 'prontera.gat';
	Object.assign(s.session, { Playing: true, NavigationMapChannelsEnabled: true, Entity: { position: [150, 170], action: 0, ACTION: { DIE: 9 } } });
	s.search.mockResolvedValue([]); s.path.mockResolvedValue([{ map: 'prontera', x: 1, y: 2 }]);
});
it('uses shared search scope/channel options and normalizes catalogue rows', async () => {
	s.search.mockResolvedValue([{ type: 'NPC', name: '卡普拉', mapName: 'prontera.gat', x: 151, y: 171, npcClass: 112 }]);
	const nav = createGameNavigation(() => true); await nav.search(' 卡普拉 ', 'NPC', 'CURRENT');
	expect(s.search).toHaveBeenCalledWith('卡普拉', 'NPC', { currentMap: 'prontera', scope: 'CURRENT', channelsEnabled: true });
	expect(nav.snapshot().results[0]).toMatchObject({ mapName: 'prontera', hasCoordinates: true, availability: 'unknown' });
});
it('ignores stale search completions and requests after closing', async () => {
	let complete; s.search.mockImplementationOnce(() => new Promise(resolve => complete = resolve));
	const nav = createGameNavigation(() => true); const first = nav.search('old'); await nav.search('new');
	complete([{ type: 'MAP', name: '旧地图', mapName: 'old' }]); await first; expect(nav.snapshot().results).toEqual([]);
	nav.destroy(); await nav.search('closed'); expect(s.search).toHaveBeenCalledTimes(2);
});
it('plans from current position and invalidates an in-flight route on cancellation', async () => {
	const nav = createGameNavigation(() => true); await nav.plan({ mapName: 'PRONTERA.gat', x: 10, y: 20 });
	expect(s.path).toHaveBeenCalledWith('prontera', 150, 170, 'prontera', 10, 20, [200, 201]);
	let complete; s.path.mockImplementationOnce(() => new Promise(resolve => complete = resolve));
	const request = nav.plan({ mapName: 'geffen', x: 10, y: 20 }); nav.cancel(); complete([{ map: 'geffen' }]); await request;
	expect(nav.snapshot()).toMatchObject({ target: null, route: [], pending: false });
});
it('rejects incomplete coordinates, a replaced character and a changed map', async () => {
	const nav = createGameNavigation(() => true);
	for (const x of ['', null, -1, 1024, 1.5]) expect(await nav.plan({ mapName: 'prontera', x, y: 2 })).toBe(false);
	expect(s.path).not.toHaveBeenCalled();
	let complete; s.path.mockImplementationOnce(() => new Promise(resolve => complete = resolve));
	const pending = nav.plan({ mapName: 'geffen', x: 2, y: 3 }); s.map.currentMap = 'payon'; complete([{ map: 'prontera' }]); await pending;
	expect(nav.snapshot().route).toEqual([]);
	s.session.Entity = { position: [1, 2], action: 0, ACTION: { DIE: 9 } }; expect(nav.snapshot().allowed).toBe(false);
});
it('renders destinations as text and clears coordinates for map-only results', async () => {
	s.search.mockResolvedValue([{ type: 'MAP', name: '<img src=x>', mapName: 'geffen', x: null, y: null }]);
	const body = document.createElement('div'); const panel = createNavigationPanel(body, () => true);
	body.querySelector('[aria-label="搜索目的地"]').value = 'geffen'; await body.querySelector('[data-search]').onsubmit({ preventDefault() {} });
	body.querySelector('[data-results] button').click(); expect(body.querySelector('[data-map]').value).toBe('geffen'); expect(body.querySelector('[data-x]').value).toBe('');
	expect(body.querySelector('img')).toBeNull(); panel.destroy();
});
