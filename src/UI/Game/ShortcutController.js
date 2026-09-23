import { canExecuteSkill, executeSkillUse, SKILL_INF } from 'UI/Components/SkillList/SkillUse.js';

/** UI-independent shortcut flow. Reads current server-backed state again before every use. */
export function createShortcutController(data) {
	let page = 0,
		pending = null,
		message = '';
	const count = () => Math.min(36, data.bindings().length);
	const pages = () => Math.max(1, Math.ceil(count() / 3));
	function describe(index) {
		const binding = data.bindings()[index];
		if (!binding?.ID) return { index, empty: true, name: '空槽位', available: true };
		const entry = data.describe(binding);
		const cooldown = binding.isSkill ? data.cooldown(binding.ID) : 0;
		let reason = entry.reason || '';
		if (!reason && cooldown > 0) reason = `冷却 ${Math.ceil(cooldown / 1000)} 秒`;
		if (!reason && !data.canUse()) reason = '当前无法使用';
		return { ...entry, index, binding: { ...binding }, cooldown, reason, available: !reason, empty: false };
	}
	function validPending() {
		if (!pending) return false;
		const current = describe(pending.index);
		return (
			current.available &&
			data.self(pending.binding.ID) === pending.caster &&
			current.binding?.isSkill &&
			current.binding.ID === pending.binding.ID &&
			current.binding.count === pending.binding.count
		);
	}
	function cancel() {
		pending = null;
		data.supportPicking(false);
	}
	function castTarget(target) {
		if (!pending) return false;
		if (!validPending()) {
			cancel();
			return false;
		}
		if (!data.canTarget(target, pending.inf, pending.binding.ID)) return false;
		const { index, binding } = pending;
		const current = describe(index);
		if (!current.available || current.binding?.ID !== binding.ID || current.binding?.count !== binding.count) {
			cancel();
			return false;
		}
		cancel();
		if (data.castId(binding.ID, binding.count, target.GID) === false) message = '无法施放，请先靠近目标';
		return true;
	}
	function use(index) {
		message = '';
		cancel();
		const entry = describe(index);
		if (entry.empty) return { configure: index };
		if (!entry.available) return { message: entry.reason };
		const binding = entry.binding;
		if (!binding.isSkill) {
			data.useItem(binding.ID);
			return {};
		}
		const skill = data.skill(binding.ID);
		executeSkillUse(skill, binding.count, {
			onUseSkill: (id, level) => data.castId(id, level),
			onSelectTarget: (_, inf) => {
				pending = { index, binding, inf, name: entry.name, caster: data.self(binding.ID) };
				data.supportPicking(Boolean(inf & SKILL_INF.FRIEND));
				if (!(inf & SKILL_INF.PLACE)) castTarget(data.target());
			}
		});
		return { message };
	}
	return {
		slotName(index) {
			return describe(index).name;
		},
		snapshot() {
			page = Math.min(page, pages() - 1);
			if (pending && (!data.canUse() || !validPending())) cancel();
			return {
				page,
				pages: pages(),
				slots: Array.from({ length: Math.min(3, Math.max(0, count() - page * 3)) }, (_, i) =>
					describe(page * 3 + i)
				),
				pending: pending
					? {
							name: pending.name,
							ground: Boolean(pending.inf & SKILL_INF.PLACE),
							self: Boolean(pending.inf & SKILL_INF.FRIEND)
						}
					: null
			};
		},
		turn(delta) {
			cancel();
			page = (page + delta + pages()) % pages();
		},
		candidates() {
			return data.candidates();
		},
		configure(index, choice, level) {
			if (!Number.isInteger(index) || index < 0 || index >= count()) return false;
			cancel();
			if (!choice) return data.configure(index, false, 0, 0);
			if (choice.isSkill) {
				const skill = data.skill(choice.ID);
				if (!canExecuteSkill(skill) || !Number.isInteger(level) || level < 1 || level > skill.level)
					return false;
			} else if (!data.hasItem(choice.ID)) return false;
			return data.configure(index, choice.isSkill, choice.ID, choice.isSkill ? level : 0);
		},
		use,
		pick(x, y) {
			if (!pending) return false;
			if (!validPending()) {
				cancel();
				return true;
			}
			const hit = data.pick(x, y);
			if (pending.inf & SKILL_INF.PLACE) {
				if (hit.ground) {
					const { index, binding } = pending;
					if (describe(index).available) {
						cancel();
						data.castGround(binding.ID, binding.count, hit.ground[0], hit.ground[1]);
					} else cancel();
				}
			} else castTarget(hit.target);
			return true; // Selection consumes the tap even if the target is invalid.
		},
		self() {
			return pending ? castTarget(data.self(pending.binding.ID)) : false;
		},
		cancel
	};
}
