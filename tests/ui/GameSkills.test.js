vi.mock('UI/Components/GameTools/AdventureControlService.js', () => ({ maintainCurrentCharacter: s.maintain }));
import { beforeEach, expect, it, vi } from 'vitest';
const s = vi.hoisted(() => ({ skills: [], revision: 0, points: 2, allowed: true, maintain: vi.fn(), learn: vi.fn(), configure: vi.fn(() => true), session: { Playing: true, Entity: { _job: 0, action: 0, ACTION: { DIE: 99 } } } }));
vi.mock('UI/Components/SkillList/SkillList.js', () => ({ default: { getUI: () => ({ getSkills: () => s.skills, getSkillPoints: () => s.points, getSkillRevision: () => s.revision, onIncreaseSkill: s.learn }) } }));
vi.mock('DB/Skills/SkillInfo.generated.js', () => ({ default: { 1: { Name: 'skill', SkillName: '主动技能', MaxLv: 10 }, 2: { Name: 'passive', SkillName: '被动技能', MaxLv: 10 }, 3: { Name: 'locked', SkillName: '未学习', MaxLv: 5, _NeedSkillList: [[1,5]] } } }));
vi.mock('DB/Skills/SkillTreeView.generated.js', () => ({ default: { 0: { beforeJob: null, 1: {}, 2: {}, 3: {} } } }));
vi.mock('Core/Client.js', () => ({ default: { loadFile: vi.fn() } }));
vi.mock('DB/DBManager.js', () => ({ default: { INTERFACE_PATH: '', getSkillDescription: () => '^ff0000技能说明' } }));
vi.mock('Engine/SessionStorage.js', () => ({ default: s.session }));
import { createGameSkills } from '../../src/UI/Game/GameSkills.js';
beforeEach(() => { vi.clearAllMocks(); s.allowed = true; s.points = 2; s.revision = 0; s.session.Playing = true; s.session.Entity = { _job: 0, action: 0, ACTION: { DIE: 99 } }; s.skills = [{ SKID: 1, level: 2, type: 4, upgradable: true }, { SKID: 2, level: 1, type: 0, upgradable: false }]; });
it('uses server upgrade permission and confirms one level without optimistic changes or duplicate requests', () => {
 const service = createGameSkills(() => s.allowed, { configure: s.configure });
 expect(service.snapshot().skills.find(skill => skill.id === 3).requirements).toEqual(['主动技能 2/5']);
 service.learn(2,2); service.learn(3,1); service.learn(1,4); expect(s.learn).not.toHaveBeenCalled();
 service.learn(1,3); service.learn(1,3); expect(s.learn).toHaveBeenCalledExactlyOnceWith(1); expect(s.points).toBe(2); expect(s.skills[0].level).toBe(2);
 s.skills[0].level = 3; s.revision++; service.learn(1,4); expect(s.learn).toHaveBeenCalledTimes(2);
});
it('binds only learned active levels and blocks death, disconnection and unavailable modal', () => {
 const service = createGameSkills(() => s.allowed, { configure: s.configure });
 for (const [id,level] of [[1,0],[1,3],[1,1.5],[2,1],[3,1]]) expect(service.bind(id,level,0)).toBe(false);
 expect(service.bind(1,1,35)).toBe(true); expect(s.configure).toHaveBeenCalledExactlyOnceWith(35,{ isSkill:true, ID:1 },1);
 s.allowed = false; service.bind(1,1,0); s.allowed = true; s.session.Entity.action = 99; service.bind(1,1,0); s.session.Entity.action = 0; s.session.Playing = false; service.bind(1,1,0);
 expect(s.configure).toHaveBeenCalledTimes(1);
});

it('blocks reset during learning, guards repeat resets and refreshes from server skill revisions', async () => {
 const service = createGameSkills(() => s.allowed, { configure: s.configure });
 service.learn(1, 3); await service.reset(); expect(s.maintain).not.toHaveBeenCalled();
 s.revision++;
 let resolve; s.maintain.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
 const request = service.reset(); await service.reset(); service.learn(1, 3);
 expect(s.maintain).toHaveBeenCalledExactlyOnceWith('character.skills.reset', {});
 expect(s.learn).toHaveBeenCalledTimes(1);
 expect(service.bind(1, 1, 0)).toBe(false);
 expect(service.snapshot().canReset).toBe(false);
 s.skills[0].level = 0; s.points = 5; s.revision++;
 resolve({}); await request;
 expect(service.snapshot()).toMatchObject({ points: 5, canReset: true, message: '技能点已重置' });
 expect(service.snapshot().skills.find(x => x.id === 1).level).toBe(0);
});
