import { beforeEach, expect, it, vi } from 'vitest';
const s = vi.hoisted(() => ({
	session: { Playing: true, FreezeUI: false, Entity: { action: 0, ACTION: { DIE: 99 }, life: { sp: 10 } } },
	skill: { SKID: 1, level: 3, type: 4, spcost: 15 },
	bindings: [{ isSkill: true, ID: 1, count: 3 }],
	items: [],
	selection: { onUseSkillToId: vi.fn(), onUseSkillToPos: vi.fn(), checkMapState: () => false },
	useItem: vi.fn(), configure: vi.fn(() => true)
}));
vi.mock('UI/Components/ShortCut/ShortCut.js', () => ({
	default: { getList: () => s.bindings, getSkillById: () => s.skill, configure: s.configure }
}));
vi.mock('UI/Components/Inventory/Inventory.js', () => ({
	default: {
		getUI: () => ({ list: s.items, getItemById: id => s.items.find(i => i.ITID === id), useItem: s.useItem })
	}
}));
vi.mock('UI/Components/SkillList/SkillList.js', () => ({ default: { getUI: () => ({ getSkills: () => [s.skill] }) } }));
vi.mock('UI/Components/SkillTargetSelection/SkillTargetSelection.js', () => ({ default: s.selection }));
vi.mock('DB/Skills/SkillInfo.generated.js', () => ({ default: { 1: { Name: 'test', SkillName: '测试技能' } } }));
vi.mock('DB/DBManager.js', () => ({
	default: {
		INTERFACE_PATH: 'ui/',
		getItemInfo: () => ({ identifiedResourceName: 'potion', identifiedDisplayName: '药水' }),
		getItemName: () => '药水'
	}
}));
vi.mock('Core/Client.js', () => ({
	default: { loadFile: (path, callback) => callback('data:image/png;base64,AA==') }
}));
vi.mock('Engine/SessionStorage.js', () => ({ default: s.session }));
vi.mock('Renderer/EntityManager.js', () => ({ default: { getFocusEntity: () => null, setSupportPicking: vi.fn() } }));
vi.mock('Renderer/Camera.js', () => ({ default: {} }));
vi.mock('Renderer/Map/Altitude.js', () => ({ default: {} }));
vi.mock('Controls/MouseEventHandler.js', () => ({ default: {} }));
import { createGameShortcuts } from '../../src/UI/Game/GameShortcuts.js';
beforeEach(() => {
	vi.clearAllMocks();
	s.session.FreezeUI = false;
	s.session.Entity.life.sp = 10;
	s.bindings = [{ isSkill: true, ID: 1, count: 3 }];
	s.items = [];
});
it('uses server SP cost at learned level, blocks external modals, and leaves lower-level costs to the server', () => {
	const service = createGameShortcuts();
	expect(service.snapshot().slots[0].reason).toBe('SP 不足');
	s.bindings[0].count = 1;
	expect(service.snapshot().slots[0].available).toBe(true);
	s.session.FreezeUI = true;
	service.use(0);
	expect(s.selection.onUseSkillToId).not.toHaveBeenCalled();
	expect(service.snapshot().slots[0].available).toBe(false);
	s.session.FreezeUI = false;
	service.use(0);
	expect(s.selection.onUseSkillToId).toHaveBeenCalledExactlyOnceWith(1, 1, undefined, { allowMove: true });
});
it('updates item count and identity from live data and passes joystick ownership to shared skill use', () => {
	const service = createGameShortcuts(() => true);
	s.bindings[0].count = 1;
	service.use(0);
	expect(s.selection.onUseSkillToId).toHaveBeenCalledWith(1, 1, undefined, { allowMove: false });
	s.bindings = [{ isSkill: false, ID: 501, count: 0 }];
	expect(service.snapshot().slots[0].reason).toBe('道具已用完');
	s.items = [{ ITID: 501, index: 2, type: 0, count: 4, IsIdentified: true }];
	expect(service.snapshot().slots[0].amount).toBe(4);
	expect(service.snapshot().slots[0].icon).toContain('data:image');
	service.use(0);
	expect(s.useItem).toHaveBeenCalledWith(s.items[0]);
	s.items[0].count = 0;
	service.use(0);
	expect(s.useItem).toHaveBeenCalledTimes(1);
});

it('configures and uses non-stackable equipment even when packet data omits quantity', () => {
 const service = createGameShortcuts();
 s.items = [{ ITID: 1201, index: 7, type: 5, IsIdentified: true }];
 s.bindings = [{ isSkill: false, ID: 1201, count: 0 }];
 expect(service.candidates().some(item => item.ID === 1201)).toBe(true);
 expect(service.configure(0, { isSkill: false, ID: 1201 })).toBe(true);
 expect(s.configure).toHaveBeenCalledWith(0, false, 1201, 0);
 expect(service.snapshot().slots[0].amount).toBe(1);
 expect(service.snapshot().slots[0].available).toBe(true);
 service.use(0); expect(s.useItem).toHaveBeenCalledExactlyOnceWith(s.items[0]);
});
