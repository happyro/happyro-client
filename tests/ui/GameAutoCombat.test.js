import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ session: {}, entities: [], skills: [], focus: null, cast: vi.fn(), ground: vi.fn(), attack: vi.fn(), stop: vi.fn(), send: vi.fn(), cooldown: 0, path: 1 }));
vi.mock('Engine/SessionStorage.js', () => ({ default: state.session }));
vi.mock('Renderer/EntityManager.js', () => ({ default: {
	forEach: fn => state.entities.forEach(fn), get: id => state.entities.find(entity => entity.GID === id),
	getFocusEntity: () => state.focus, setFocusEntity: target => { state.focus = target; }, setOverEntity: vi.fn()
} }));
vi.mock('Renderer/Renderer.js', () => ({ default: { tick: 1000 } }));
vi.mock('Controls/MapControl.js', () => ({ default: { onRequestStopWalk: vi.fn() } }));
vi.mock('Utils/PathFinding.js', () => ({ default: { search: () => state.path } }));
vi.mock('Renderer/Map/Altitude.js', () => ({ default: { TYPE: { WALKABLE: 1 } } }));
vi.mock('UI/Components/SkillList/SkillList.js', () => ({ default: { getUI: () => ({ getSkills: () => state.skills }) } }));
vi.mock('UI/Components/SkillTargetSelection/SkillTargetSelection.js', () => ({ default: { onUseSkillToId: state.cast, onUseSkillToPos: state.ground } }));
vi.mock('DB/Skills/SkillInfo.generated.js', () => ({ default: {} }));
vi.mock('DB/DBManager.js', () => ({ default: { getMonsterName: () => '波利' } }));
vi.mock('Network/SkillCooldowns.js', () => ({ remainingCooldown: () => state.cooldown }));
vi.mock('Network/NetworkManager.js', () => ({ default: { sendPacket: state.send } }));
vi.mock('Network/PacketStructure.js', () => ({ default: { CZ: { REQUEST_MOVE2: class { dest = []; } } } }));
vi.mock('UI/Game/GameCommands.js', () => ({ attackSelected: state.attack, stopAttack: () => { state.stop(); state.session.moveAction = null; } }));
import { createGameAutoCombat } from '../../src/UI/Game/GameAutoCombat.js';
beforeEach(() => {
	localStorage.clear();
	vi.clearAllMocks(); state.focus = null; state.cooldown = 0; state.path = 1;
	state.session.Playing = true; state.session.moveAction = null;
	state.session.Entity = { position: [0, 0], life: { sp: 20 }, action: 0, ACTION: { DIE: 9, SIT: 2 }, cast: { display: false }, amotionTick: 0 };
	state.entities = [{ GID: 10, job: 1002, objecttype: 1, constructor: { TYPE_MOB: 1 }, action: 0, ACTION: { DIE: 9 }, remove_tick: 0, display: { name: '波利' }, position: [2, 0], onFocus: vi.fn(), onFocusEnd: vi.fn() }];
	state.skills = [{ SKID: 5, type: 1, level: 3, spcost: 8 }];
});
it('selects real monsters and casts the learned level at the live GID', () => {
	const controller = createGameAutoCombat(() => true); controller.configure([{ id: 1002, name: '波利' }], [5], { search: 20, activity: 30 }); controller.start();
	expect(state.focus).toBe(state.entities[0]); expect(state.cast).toHaveBeenCalledExactlyOnceWith(5, 3, 10);
});
it('casts ground skills at the target position and excludes passive and friendly-only skills', () => {
	state.skills = [{ SKID: 20, type: 2, level: 2, spcost: 5 }, { SKID: 21, type: 0, level: 2 }, { SKID: 22, type: 16, level: 2 }];
	const controller = createGameAutoCombat(() => true); expect(controller.skills()).toHaveLength(1);
	controller.configure([], [20], { search: 20, activity: 30 }); controller.start(); expect(state.ground).toHaveBeenCalledExactlyOnceWith(20, 2, 2, 0);
});
it.each(['cooldown', 'sp'])('falls back to ordinary attacks when blocked by %s', reason => {
	if (reason === 'cooldown') state.cooldown = 1000; else state.session.Entity.life.sp = 1;
	const controller = createGameAutoCombat(() => true); controller.configure([], [5], { search: 20, activity: 30 }); controller.start();
	expect(state.attack).toHaveBeenCalledOnce(); expect(state.cast).not.toHaveBeenCalled();
});
it('ignores dead, disappearing, non-monster and unreachable entities', () => {
	state.entities[0].remove_tick = 1;
	const controller = createGameAutoCombat(() => true); controller.start(); expect(state.attack).not.toHaveBeenCalled();
	state.entities[0].remove_tick = 0; state.entities[0].action = 9; controller.tick(); expect(state.attack).not.toHaveBeenCalled();
	state.entities[0].action = 0; state.entities[0].objecttype = 2; controller.tick(); expect(state.attack).not.toHaveBeenCalled();
	state.entities[0].objecttype = 1; state.path = 0; controller.tick(); expect(state.attack).not.toHaveBeenCalled();
});
it('cancels a queued chase and requests a stop at the player position', () => {
	const controller = createGameAutoCombat(() => true); controller.start(); state.session.moveAction = { targetID: 10 }; controller.stop();
	expect(state.session.moveAction).toBeNull(); expect(state.send).toHaveBeenCalledWith(expect.objectContaining({ dest: [0, 0] }));
});
it('stops when the player becomes unavailable and never casts through a busy cast bar', () => {
	const controller = createGameAutoCombat(() => true); state.session.Entity.cast.display = true; controller.start(); expect(state.attack).not.toHaveBeenCalled();
	state.session.Entity.isOverWeight = true; controller.tick(); expect(controller.snapshot().active).toBe(false);
});
