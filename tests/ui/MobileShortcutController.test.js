import { beforeEach, expect, it, vi } from 'vitest';
import { createShortcutController } from '../../src/UI/Game/ShortcutController.js';
import { clearCooldowns } from '../../src/Network/SkillCooldowns.js';
let bindings, skills, data, controller, target, hit, cooldown, alive;
beforeEach(() => {
	clearCooldowns();
	cooldown = 0;
	alive = true;
	target = null;
	hit = {};
	bindings = Array.from({ length: 36 }, () => ({ ID: 0, isSkill: false, count: 0 }));
	skills = {
		1: { SKID: 1, type: 4, level: 5 },
		2: { SKID: 2, type: 1, level: 3 },
		3: { SKID: 3, type: 2, level: 1 },
		4: { SKID: 4, type: 16, level: 2 }
	};
	data = {
		bindings: () => bindings,
		skill: id => skills[id],
		cooldown: () => cooldown,
		describe: b => ({
			name: '技能' + b.ID,
			amount: b.count,
			reason: b.isSkill && (!skills[b.ID] || skills[b.ID].level < b.count) ? '不可用' : ''
		}),
		canUse: () => alive,
		supportPicking: vi.fn(),
		canTarget: (t, inf) => Boolean(t && t.kind === inf),
		target: () => target,
		self: (() => { const caster = { GID: 9, kind: 16 }; return () => caster; })(),
		castId: vi.fn(),
		castGround: vi.fn(),
		useItem: vi.fn(),
		hasItem: id => id === 501,
		configure: vi.fn((i, isSkill, ID, count) => {
			bindings[i] = { isSkill, ID, count };
			return true;
		}),
		candidates: () => [],
		pick: () => hit
	};
	controller = createShortcutController(data);
});
it('pages through shared bindings and validates replacement, level and clearing', () => {
	expect(controller.snapshot().pages).toBe(12);
	controller.turn(-1);
	expect(controller.snapshot().slots[0].index).toBe(33);
	expect(controller.configure(33, { isSkill: true, ID: 1 }, 6)).toBe(false);
	expect(controller.configure(33, { isSkill: true, ID: 1 }, 2)).toBe(true);
	expect(bindings[33]).toEqual({ isSkill: true, ID: 1, count: 2 });
	expect(controller.configure(33, null)).toBe(true);
	expect(controller.snapshot().slots[0].empty).toBe(true);
	expect(controller.configure(36, null)).toBe(false);
	expect(controller.configure(1, { isSkill: false, ID: 999 })).toBe(false);
});
it('executes a self skill once with the configured level, and blocks cooldown/death', () => {
	controller.configure(0, { isSkill: true, ID: 1 }, 2);
	controller.use(0);
	expect(data.castId).toHaveBeenCalledExactlyOnceWith(1, 2);
	cooldown = 2500;
	expect(controller.use(0).message).toContain('冷却');
	expect(controller.snapshot().slots[0].cooldown).toBe(2500);
	cooldown = 0;
	alive = false;
	controller.use(0);
	expect(data.castId).toHaveBeenCalledTimes(1);
});
it('uses current valid target or waits without sending to an invalid target', () => {
	controller.configure(0, { isSkill: true, ID: 2 }, 3);
	target = { GID: 22, kind: 16 };
	controller.use(0);
	expect(data.castId).not.toHaveBeenCalled();
	expect(controller.snapshot().pending).not.toBeNull();
	hit = { target: { GID: 33, kind: 1 } };
	expect(controller.pick(10, 20)).toBe(true);
	expect(data.castId).toHaveBeenCalledExactlyOnceWith(2, 3, 33);
	expect(controller.snapshot().pending).toBeNull();
	target = { GID: 22, kind: 1 };
	controller.use(0);
	expect(data.castId).toHaveBeenLastCalledWith(2, 3, 22);
});
it('ground targeting consumes invalid taps, uses clicked coordinates and cancels cleanly', () => {
	controller.configure(0, { isSkill: true, ID: 3 }, 1);
	controller.use(0);
	expect(controller.snapshot().pending.ground).toBe(true);
	expect(controller.pick(1, 2)).toBe(true);
	expect(data.castGround).not.toHaveBeenCalled();
	hit = { ground: [12, 34] };
	controller.pick(1, 2);
	expect(data.castGround).toHaveBeenCalledExactlyOnceWith(3, 1, 12, 34);
	controller.use(0);
	controller.cancel();
	expect(controller.pick(1, 2)).toBe(false);
	expect(data.supportPicking).toHaveBeenLastCalledWith(false);
});
it('revalidates state between selection and casting so removed skills or changed bindings cannot fire', () => {
	controller.configure(0, { isSkill: true, ID: 3 }, 1);
	controller.use(0);
	bindings[0] = { isSkill: false, ID: 501, count: 0 };
	hit = { ground: [1, 2] };
	expect(controller.pick(1, 2)).toBe(true);
	expect(data.castGround).not.toHaveBeenCalled();
	controller.configure(0, { isSkill: true, ID: 2 }, 3);
	controller.use(0);
	skills[2].level = 0;
	expect(controller.snapshot().pending).toBeNull();
});
it('supports explicit friendly self targeting and live item use', () => {
	controller.configure(0, { isSkill: true, ID: 4 }, 1);
	controller.use(0);
	expect(controller.snapshot().pending.self).toBe(true);
	controller.self();
	expect(data.castId).toHaveBeenCalledWith(4, 1, 9);
	controller.configure(1, { isSkill: false, ID: 501 });
	controller.use(1);
	expect(data.useItem).toHaveBeenCalledExactlyOnceWith(501);
	expect(controller.use(2)).toEqual({ configure: 2 });
});

it('selects self for the actual skill caster and cancels when that caster is replaced',()=>{
 const companion={GID:31,kind:16};data.self=vi.fn(()=>companion);
 controller.configure(0,{isSkill:true,ID:4},1);controller.use(0);controller.self();
 expect(data.self).toHaveBeenCalledWith(4);expect(data.castId).toHaveBeenCalledWith(4,1,31);
 data.castId.mockClear();controller.use(0);data.self=()=>({GID:32,kind:16});
 expect(controller.self()).toBe(false);expect(data.castId).not.toHaveBeenCalled();
 expect(controller.snapshot().pending).toBeNull();
});
