import { beforeEach, afterEach, expect, it, vi } from 'vitest';
vi.mock('Engine/SessionStorage.js', () => ({ default: { Playing: true, Entity: { action: 0, ACTION: { DIE: 1 } } } }));
vi.mock('Network/NetworkManager.js', () => ({ default: { sendPacket: vi.fn() } }));
vi.mock('Network/PacketStructure.js', () => ({ default: { CZ: { HAPPYRO_STOP_MOVE: class StopMove {} } } }));
import Network from 'Network/NetworkManager.js';
const mock = vi.hoisted(() => ({ listener: null, state: null }));
vi.mock('UI/Components/Navigation/Navigation.js', () => ({ default: {
 getRouteState: () => mock.state,
 subscribeRouteState: listener => { mock.listener = listener; },
 stopAutoWalk: vi.fn(), clear: vi.fn(),
 navigateTo: vi.fn(options => {
  mock.state = { active: false, pending: true, unavailable: false, path: [], target: { map: options.endMap, x: options.endX, y: options.endY } };
  mock.listener(mock.state);
 })
} }));
vi.mock('../../src/UI/Components/GameTools/AdventureActionService.js', () => ({
 getCurrentAdventureMap: () => 'prontera', getCurrentAdventurePosition: () => ({ x: 10, y: 10 }), normalizeAdventureMap: map => map
}));
let service, navigation, state;
const target = { mapName: 'prontera', x: 30, y: 30 };
beforeEach(async () => {
 vi.resetModules(); vi.clearAllMocks(); vi.useFakeTimers();
 mock.state = { active: false, pending: false, unavailable: false, path: [], target: null };
 service = await import('../../src/UI/Components/GameTools/AdventureRouteService.js');
 navigation = (await import('UI/Components/Navigation/Navigation.js')).default;
 service.subscribeAdventureRoute(next => { state = next; });
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
it('waits for delayed preview before accepting start and ignores repeated starts', () => {
 service.previewAdventureRoute(target);
 expect(state.pending).toBe(true);
 expect(service.startAdventureRoute(target)).toBe(false);
 mock.listener({ ...mock.state, pending: false, path: [{ x: 10, y: 10 }, { x: 30, y: 30 }] });
 expect(state.path).toHaveLength(2);
 expect(service.startAdventureRoute(target)).toBe(true);
 expect(service.startAdventureRoute(target)).toBe(false);
 expect(navigation.navigateTo).toHaveBeenCalledTimes(2);
 mock.listener({ ...mock.state, pending: false, active: true, path: [{ x: 10, y: 10 }, { x: 30, y: 30 }] });
 expect(state.walking).toBe(true);
 service.stopAdventureRoute();
 expect(state.active).toBe(false);
});
it('clears active state when delayed calculation cannot find a path', () => {
 service.startAdventureRoute(target);
 mock.listener({ ...mock.state, pending: false, unavailable: true });
 expect(state.active).toBe(false);
 expect(state.message).toBe('无法到达所选位置');
});

it('stops movement immediately and previews a different NPC before restarting', () => {
 service.startAdventureRoute(target);
 mock.listener({ ...mock.state, pending: false, active: true, path: [{ x: 10, y: 10 }, { x: 30, y: 30 }] });
 const next = { ...target, x: 50 };
 expect(service.previewAdventureRoute(next)).toBe(true);
 expect(Network.sendPacket).toHaveBeenCalledTimes(1);
 expect(state.active).toBe(false);
 expect(state.target.x).toBe(50);
 expect(state.pending).toBe(true);
 mock.listener({ ...mock.state, pending: false, path: [{ x: 10, y: 10 }, { x: 50, y: 30 }] });
 expect(service.startAdventureRoute(next)).toBe(true);
 expect(navigation.navigateTo).toHaveBeenLastCalledWith(expect.objectContaining({ endX: 50, autoWalk: true }));
});
it('allows a different target to replace an active route but rejects duplicate starts', () => {
 service.startAdventureRoute(target);
 expect(service.startAdventureRoute({ ...target, x: 60 })).toBe(true);
 expect(service.startAdventureRoute({ ...target, x: 60 })).toBe(false);
 expect(state.target.x).toBe(60);
});
it('only sends one stop packet for repeated explicit stops and none for arrival', () => {
 service.startAdventureRoute(target);
 service.stopAdventureRoute();
 service.stopAdventureRoute();
 expect(Network.sendPacket).toHaveBeenCalledTimes(1);
});
