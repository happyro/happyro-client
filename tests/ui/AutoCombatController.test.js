import { beforeEach, expect, it, vi } from 'vitest';
import { createAutoCombatController } from '../../src/UI/Game/AutoCombatController.js';
let data, controller, time, targets, skills, enabled, busy, chasing;
const mob = (id, species = 1002, x = 2) => ({ id, species, name: `魔物${species}`, position: [x, 0] });
beforeEach(() => {
	time = 0; enabled = true; busy = false; chasing = false; targets = [mob(1), mob(2, 1002, 4), mob(3, 1003, 1)]; skills = [];
	data = { now: () => time, random: () => 0.75, enabled: () => enabled, position: () => [0, 0], targets: () => targets, skills: () => skills, busy: () => busy, chasing: () => chasing, reachable: () => true, select: vi.fn(), stop: vi.fn(), act: vi.fn(() => true) };
	controller = createAutoCombatController(data);
});
it('selects the nearest of the chosen species, replaces dead targets and waits for new spawns', () => {
	controller.configure({ id: 1002, name: '波利' }, []); controller.start();
	expect(data.act).toHaveBeenLastCalledWith(targets[0], null);
	targets = targets.slice(1); controller.tick();
	expect(data.act).toHaveBeenLastCalledWith(targets[0], null);
	targets = [mob(3, 1003)]; controller.tick();
	expect(controller.snapshot()).toMatchObject({ active: true, status: '等待附近目标' });
	targets.push(mob(4)); controller.tick();
	expect(data.act).toHaveBeenLastCalledWith(targets[1], null);
});
it('all monsters includes different species but excludes distant and unreachable candidates', () => {
	targets = [mob(1, 1002, 18), mob(2), mob(3, 1003, 5)]; data.reachable = target => target.id !== 2;
	controller.start(); expect(data.act).toHaveBeenLastCalledWith(targets[2], null);
});
it('randomly chooses only configured available skills and falls back to normal attacks', () => {
	skills = [{ id: 5, available: true }, { id: 6, available: false }, { id: 7, available: true }, { id: 8, available: true }];
	controller.configure(null, [5, 6, 7]); controller.start();
	expect(data.act.mock.calls[0][1].id).toBe(7);
	data.random = () => 0; time = 1000; controller.tick(); expect(data.act.mock.calls[1][1].id).toBe(5);
	skills.forEach(skill => skill.available = false); time = 2000; controller.tick(); expect(data.act.mock.calls[2][1]).toBeNull();
});
it('throttles requests and never interrupts an in-flight cast or chase', () => {
	controller.start(); controller.tick(); expect(data.act).toHaveBeenCalledTimes(1);
	busy = true; time = 1200; controller.tick(); expect(data.act).toHaveBeenCalledTimes(1);
	busy = false; controller.tick(); expect(data.act).toHaveBeenCalledTimes(2);
});
it('stops permanently on manual stop or disabled session until explicitly restarted', () => {
	controller.start(); enabled = false; controller.tick();
	expect(controller.snapshot().active).toBe(false);
	enabled = true; time = 2000; controller.tick(); expect(data.act).toHaveBeenCalledTimes(1);
	controller.start(); controller.stop(); controller.tick(); expect(data.act).toHaveBeenCalledTimes(2);
});
it('abandons stalled chases and temporarily skips unreachable targets', () => {
	controller.start(); chasing = busy = true; time = 100; controller.tick(); time = 8200; controller.tick();
	expect(controller.snapshot().status).toContain('无法接近');
	busy = chasing = false; controller.tick(); expect(data.act.mock.calls.at(-1)[0].id).toBe(1);
});
it('cancels pending actions immediately when the target leaves the visible entity list', () => {
	controller.start(); data.stop.mockClear(); targets = []; busy = true; controller.tick();
	expect(data.stop).toHaveBeenCalledOnce(); expect(controller.snapshot().target).toBe('');
});
