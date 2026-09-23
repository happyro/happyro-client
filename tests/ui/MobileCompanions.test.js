import { beforeEach, expect, it, vi } from 'vitest';
const s = vi.hoisted(() => ({ session: {}, actors: new Map(), send: vi.fn(), cancel: vi.fn(), ai: {}, skills: [], revision: 0, learn: vi.fn() }));
vi.mock('Engine/SessionStorage.js', () => ({ default: s.session }));
vi.mock('Renderer/EntityManager.js', () => ({ default: { get: id => s.actors.get(id) } }));
vi.mock('Network/NetworkManager.js', () => ({ default: { sendPacket: s.send } }));
vi.mock('Network/PacketStructure.js', () => ({ default: { CZ: new Proxy({}, { get: (t, name) => t[name] ||= class { packetName = name; } }) } }));
vi.mock('Core/AIDriver.js', () => ({ default: s.ai }));
vi.mock('DB/Skills/SkillInfo.generated.js', () => ({ default: {} }));
vi.mock('Engine/MapEngine/CompanionSkillAction.js', () => ({ cancelCompanionSkill: s.cancel }));
vi.mock('UI/Components/SkillListMH/SkillListMH.js', () => { const model = { getSkills: () => s.skills, getSkillRevision: () => s.revision, onIncreaseSkill: s.learn }; return { default: { homunculus: model, mercenary: model } }; });
import { openGameCompanions, resetGameCompanions, updateGameCompanion, receiveGameCompanionFeed, updateGameCompanionAutoFeed } from '../../src/UI/Game/GameCompanions.js';
import { clearInteraction } from '../../src/UI/Game/ServerInteraction.js';
import { createCompanionsPanel } from '../../src/UI/Mobile/game/CompanionsPanel.js';
beforeEach(() => {
	vi.clearAllMocks(); clearInteraction(); s.actors.clear(); s.revision = 1; s.skills = [{ SKID: 8001, level: 1, upgradable: true, type: 4 }];
	Object.assign(s.session, { Playing: true, Entity: { action: 0, ACTION: { DIE: 9 } }, homunId: 31, mercId: 32 });
	for (const id of [31, 32]) s.actors.set(id, { GID: id, action: 0, ACTION: { DIE: 9 }, remove_tick: 0 });
	resetGameCompanions();
	for (const [kind, gid] of [['homunculus', 31], ['mercenary', 32]]) updateGameCompanion(kind, { szName: '测试', SKPoint: 2, bModified: 0, hp: 20, maxHP: 20, nFullness: 30 }, gid);
});
it('requires confirmation and waits for feed result without consuming food locally', () => {
	const service = openGameCompanions('homunculus');
	service.confirm(); expect(s.send).not.toHaveBeenCalled();
	service.prepare('feed'); expect(s.send).not.toHaveBeenCalled(); service.confirm();
	expect(s.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ packetName: 'COMMAND_MER', type: 0, command: 1 }));
	updateGameCompanion('homunculus', { hp: 18 }); expect(service.snapshot().allowed).toBe(false);
	receiveGameCompanionFeed(0); expect(service.snapshot().allowed).toBe(true); expect(service.snapshot().message).toContain('失败');
});
it('rejects stale confirmations, external guards and old character sessions', () => {
	const service = openGameCompanions('homunculus'); service.prepare('dismiss');
	s.actors.set(31, { GID: 31, action: 0, ACTION: { DIE: 9 } }); service.confirm(); expect(s.send).not.toHaveBeenCalled();
	service.prepare('dismiss'); service.setOperationGuard(() => false); service.confirm(); expect(s.send).not.toHaveBeenCalled();
	service.setOperationGuard(() => true); service.prepare('dismiss'); s.session.Entity = { action: 0, ACTION: { DIE: 9 } }; service.confirm(); expect(s.send).not.toHaveBeenCalled();
});
it('uses distinct dismissal packets and cancels older companion movement intent', () => {
	for (const kind of ['homunculus', 'mercenary']) { const service = openGameCompanions(kind); service.prepare('dismiss'); service.confirm(); }
	expect(s.send.mock.calls.map(([p]) => p.packetName)).toEqual(['COMMAND_MER', 'MER_COMMAND']); expect(s.cancel).toHaveBeenCalled();
	const merc = openGameCompanions('mercenary'); expect(merc.prepare('feed')).toContain('不支持'); expect(merc.prepare('refresh')).toBe('未知操作');
});
it('validates UTF-8 rename and leaves server-only confirmations authoritative', () => {
	const service = openGameCompanions('homunculus'); expect(service.prepare('rename', '名'.repeat(8))).toContain('无效');
	expect(service.prepare('rename', '新生命体')).toBe(''); service.confirm(); expect(service.snapshot().info.szName).toBe('测试'); expect(service.snapshot().allowed).toBe(true);
	service.prepare('autofeed'); service.confirm(); expect(service.snapshot().autoFeed).toBe(false); updateGameCompanionAutoFeed(1); expect(service.snapshot().autoFeed).toBe(true);
	updateGameCompanion('homunculus', { szName: '新生命体', bModified: 1 }); expect(service.prepare('rename', '其他')).toContain('已经改名');
});
it('gates skill learning by points, server level, revision and companion type', () => {
	const service = openGameCompanions('homunculus'); service.learn(8001, 3); expect(s.learn).not.toHaveBeenCalled();
	service.learn(8001, 2); service.learn(8001, 2); expect(s.learn).toHaveBeenCalledExactlyOnceWith(8001);
	s.revision++; s.skills[0].level = 2; updateGameCompanion('homunculus', { SKPoint: 0 }); expect(service.snapshot().skills[0].learnable).toBe(false);
	expect(openGameCompanions('mercenary').snapshot().skills[0].learnable).toBe(false);
});
it('preserves the entered name while live information updates and requires explicit destructive confirmation', () => {
	const service = openGameCompanions('homunculus'), body = document.createElement('div'); const panel = createCompanionsPanel(body, service);
	const input = body.querySelector('input'); input.value = '输入中'; input.dispatchEvent(new Event('input')); updateGameCompanion('homunculus', { hp: 15 }); panel.update(); expect(input.value).toBe('输入中');
	body.querySelector('[data-action=dismiss]').click(); expect(body.querySelector('[data-review]').textContent).toContain('永久删除'); expect(s.send).not.toHaveBeenCalled();
	body.querySelector('[data-confirm]').click(); expect(s.send).toHaveBeenCalledOnce();
});

it('preserves information and auto-feed received before the first spawn, but clears a replaced companion',()=>{
 resetGameCompanions(); updateGameCompanionAutoFeed(1);updateGameCompanion('homunculus',{szName:'提前到达',hp:10});
 updateGameCompanion('homunculus',{},31);const service=openGameCompanions('homunculus');expect(service.snapshot().autoFeed).toBe(true);expect(service.snapshot().info.szName).toBe('提前到达');
 s.session.homunId=33;s.actors.set(33,{GID:33,ACTION:{DIE:9},action:0});updateGameCompanion('homunculus',{},33);
 expect(service.snapshot().autoFeed).toBe(false);expect(service.snapshot().info.szName).toBeUndefined();
});
