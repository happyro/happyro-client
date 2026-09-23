import { beforeEach, expect, it, vi } from 'vitest';
const s = vi.hoisted(() => ({ session: {}, entities: new Map(), timers: [], send: vi.fn() }));
vi.mock('Engine/SessionStorage.js', () => ({ default: s.session }));
vi.mock('Renderer/EntityManager.js', () => ({ default: { get: id => s.entities.get(id) } }));
vi.mock('Network/NetworkManager.js', () => ({ default: { sendPacket: s.send } }));
vi.mock('Core/Events.js', () => ({ default: { setTimeout: fn => s.timers.push(fn) } }));
import { queueCompanionSkill, cancelCompanionSkill } from '../../src/Engine/MapEngine/CompanionSkillAction.js';
let entity, original;
beforeEach(() => {
	vi.clearAllMocks(); s.entities.clear(); s.timers.length = 0;
	original = vi.fn();
	entity = { GID: 31, position: [0, 0], action: 0, ACTION: { DIE: 9 }, remove_tick: 0, onWalkEnd: original };
	s.entities.set(31, entity);
	Object.assign(s.session, { Playing: true, FreezeUI: false, Entity: { action: 0, ACTION: { DIE: 9 } }, homunId: 31, mercId: 32, moveAction: null });
});
const queue = (packet = { SKID: 8044 }, validate = () => true) => queueCompanionSkill(entity, packet, [2, 3], validate);
const arrive = () => { entity.position = [2, 3]; entity.onWalkEnd(); };
const settle = () => s.timers.splice(0).forEach(fn => fn());
it('casts once after its own arrival, preserving the original callback and player queue', () => {
	s.session.moveAction = { player: true };
	queue(); arrive();
	expect(original).toHaveBeenCalledOnce(); expect(entity.onWalkEnd).toBe(original);
	expect(s.send).not.toHaveBeenCalled(); settle(); settle();
	expect(s.send).toHaveBeenCalledExactlyOnceWith({ SKID: 8044 });
	expect(s.session.moveAction).toEqual({ player: true });
});
it.each(['removed', 'dead', 'ownerDead', 'disconnect', 'freeze', 'replaced', 'ownerChanged', 'movedAgain', 'dismissed'])('discards %s companions during the settling delay', condition => {
	queue(); arrive();
	if (condition === 'removed') entity.remove_tick = 1;
	if (condition === 'dead') entity.action = 9;
	if (condition === 'ownerDead') s.session.Entity.action = 9;
	if (condition === 'disconnect') s.session.Playing = false;
	if (condition === 'freeze') s.session.FreezeUI = true;
	if (condition === 'replaced') s.entities.set(31, {});
	if (condition === 'ownerChanged') s.session.Entity = {};
	if (condition === 'movedAgain') entity.position = [4, 5];
	if (condition === 'dismissed') s.session.homunId = 0;
	settle(); expect(s.send).not.toHaveBeenCalled();
});
it('does not cast when an unrelated walk ends or the target becomes invalid', () => {
	queue(); entity.onWalkEnd(); settle(); expect(s.send).not.toHaveBeenCalled();
	queue({}, () => false); arrive(); settle(); expect(s.send).not.toHaveBeenCalled();
});
it('cancels and replaces pending casts without an old timer consuming the replacement', () => {
	queue({ SKID: 1 }); arrive(); queue({ SKID: 2 }); settle();
	expect(s.send).not.toHaveBeenCalled(); arrive(); settle();
	expect(s.send).toHaveBeenCalledExactlyOnceWith({ SKID: 2 });
	queue(); cancelCompanionSkill(entity); expect(entity.onWalkEnd).toBe(original);
	entity.onWalkEnd(); settle(); expect(s.send).toHaveBeenCalledTimes(1);
});
