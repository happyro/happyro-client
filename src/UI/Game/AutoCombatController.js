export const AUTO_COMBAT_RANGE_LIMITS = { min: 1, searchMax: 50, activityMax: 100 };

/** Nearby combat policy. Runtime adapters own pathfinding, packets and live skill checks. */
export function createAutoCombatController(
	data,
	configuration = { species: [], skills: [], ranges: { search: 20, activity: 30 } }
) {
	let active = false,
		pausedForMovement = false,
		continuous = false,
		preferred = null,
		species = configuration.species.map(entry => ({ ...entry })),
		ranges = { ...configuration.ranges },
		selected = [...configuration.skills],
		target = null,
		nextAction = 0;
	let origin,
		lastDistance = Infinity,
		progressAt = 0,
		status = '自动战斗已停止';
	const skipped = new Map();
	const distance = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
	function stop(message = '自动战斗已停止') {
		if (active || target) data.stop();
		active = false;
		pausedForMovement = false;
		continuous = false;
		preferred = null;
		target = null;
		status = message;
	}
	function snapshot() {
		return {
			active,
			ranges: { ...ranges },
			pausedForMovement,
			species: species.map(entry => ({ ...entry })),
			skills: [...selected],
			status,
			target: target?.name || ''
		};
	}
	function tick() {
		if (!active) return;
		if (!data.enabled()) {
			stop('自动战斗已停止');
			return;
		}
		if (pausedForMovement) return;
		const now = data.now(),
			player = data.position();
		for (const [id, until] of skipped) if (until <= now) skipped.delete(id);
		const targets = data
			.targets()
			.filter(
				entity =>
					(entity.id === preferred ||
						(continuous && (!species.length || species.some(entry => entity.species === entry.id)))) &&
					distance(player, entity.position) <= ranges.search &&
					distance(origin, entity.position) <= ranges.activity &&
					(skipped.get(entity.id) || 0) <= now
			);
		const current = target && targets.find(entity => entity.id === target.id);
		if (target && !current) {
			if (!continuous) {
				stop('目标已结束或离开，攻击已停止');
				return;
			}
			preferred = null;
			data.stop();
			target = null;
			nextAction = 0;
		}
		if (!target) {
			targets.sort((a, b) => distance(player, a.position) - distance(player, b.position));
			target = targets.find(entity => data.reachable(entity)) || null;
			if (!target) {
				status = '等待附近目标';
				return;
			}
			data.select(target);
			lastDistance = Infinity;
			progressAt = now;
		} else target = current;
		const range = distance(player, target.position);
		if (range < lastDistance || !data.chasing()) {
			progressAt = now;
			lastDistance = range;
		}
		if (now - progressAt >= 8000) {
			if (!continuous) {
				stop('目标无法接近，攻击已停止');
				return;
			}
			preferred = null;
			skipped.set(target.id, now + 30000);
			data.stop();
			target = null;
			nextAction = 0;
			status = '目标无法接近，寻找其他目标';
			return;
		}
		status = `${data.chasing() ? '接近' : '攻击'}：${target.name}`;
		if (now < nextAction || data.busy()) return;
		const skills = data.skills().filter(skill => selected.includes(skill.id) && skill.available);
		const skill = skills.length ? skills[Math.floor(data.random() * skills.length)] : null;
		if (data.act(target, skill) === false) {
			if (!continuous) {
				stop('无法攻击目标');
				return;
			}
			preferred = null;
			skipped.set(target.id, now + 30000);
			data.stop();
			target = null;
		}
		nextAction = now + 900;
	}
	return {
		snapshot,
		tick,
		stop,
		pauseForMovement() {
			if (!active || pausedForMovement) return;
			if (!continuous) {
				stop('手动移动，攻击已停止');
				return;
			}
			data.stop();
			pausedForMovement = true;
			target = null;
			preferred = null;
			status = '移动中，停止移动后继续自动战斗';
		},
		resumeAfterMovement() {
			if (!active || !pausedForMovement) return;
			pausedForMovement = false;
			origin = [...data.position()];
			nextAction = 0;
			skipped.clear();
			status = '寻找附近目标';
		},
		start() {
			if (!data.enabled()) return false;
			data.stop();
			origin = [...data.position()];
			active = true;
			pausedForMovement = false;
			continuous = true;
			preferred = null;
			target = null;
			nextAction = 0;
			skipped.clear();
			status = '寻找附近目标';
			tick();
			return true;
		},
		attackTarget(id) {
			if (!data.enabled()) return false;
			const choice = data.targets().find(entity => entity.id === id);
			if (!choice || !data.reachable(choice)) return false;
			// Keep automatic searching only if it was already enabled before this tap.
			continuous = active && continuous;
			data.stop();
			active = true;
			pausedForMovement = false;
			preferred = id;
			target = choice;
			origin = [...data.position()];
			nextAction = 0;
			lastDistance = Infinity;
			progressAt = data.now();
			skipped.delete(id);
			data.select(target);
			tick();
			return true;
		},
		configure(nextSpecies, ids, nextRanges) {
			const limits = AUTO_COMBAT_RANGE_LIMITS;
			if (
				!Number.isInteger(nextRanges.search) ||
				!Number.isInteger(nextRanges.activity) ||
				nextRanges.search < limits.min ||
				nextRanges.search > limits.searchMax ||
				nextRanges.activity < nextRanges.search ||
				nextRanges.activity > limits.activityMax
			)
				return false;
			stop();
			ranges = { ...nextRanges };
			species = [...new Map(nextSpecies.map(entry => [entry.id, { id: entry.id, name: entry.name }])).values()];
			const learned = new Set(data.skills().map(skill => skill.id));
			selected = [...new Set(ids)].filter(id => learned.has(id));
			return true;
		},
		skills: () => data.skills(),
		targets: () => data.targets()
	};
}
