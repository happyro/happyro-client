/** Nearby combat policy. Runtime adapters own pathfinding, packets and live skill checks. */
export function createAutoCombatController(data) {
	let active = false,
		species = null,
		selected = [],
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
		target = null;
		status = message;
	}
	function snapshot() {
		return { active, species, skills: [...selected], status, target: target?.name || '' };
	}
	function tick() {
		if (!active) return;
		if (!data.enabled()) {
			stop('自动战斗已停止');
			return;
		}
		const now = data.now(),
			player = data.position();
		for (const [id, until] of skipped) if (until <= now) skipped.delete(id);
		const targets = data
			.targets()
			.filter(
				entity =>
					(species === null || entity.species === species.id) &&
					distance(player, entity.position) <= 14 &&
					distance(origin, entity.position) <= 20 &&
					(skipped.get(entity.id) || 0) <= now
			);
		const current = target && targets.find(entity => entity.id === target.id);
		if (target && !current) {
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
		start() {
			if (!data.enabled()) return false;
			data.stop();
			origin = [...data.position()];
			active = true;
			target = null;
			nextAction = 0;
			skipped.clear();
			status = '寻找附近目标';
			tick();
			return true;
		},
		configure(nextSpecies, ids) {
			stop();
			species = nextSpecies ? { id: nextSpecies.id, name: nextSpecies.name } : null;
			const learned = new Set(data.skills().map(skill => skill.id));
			selected = [...new Set(ids)].filter(id => learned.has(id));
		},
		skills: () => data.skills(),
		targets: () => data.targets()
	};
}
