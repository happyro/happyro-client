/** Select targets only. Movement, packets and pickup rules belong to the existing interaction path. */
export function createAutoPickupController(io) {
	let active = null,
		started = 0,
		resumeAt = 0,
		held = false,
		batch = null,
		deadline = 0;
	const skipped = new Map();
	function cancelActive() {
		if (active) io.cancel(active);
		active = null;
	}
	function cancel() {
		cancelActive();
		batch = null;
	}
	function manual(kind) {
		cancel();
		if (kind === 'move-start') held = true;
		if (kind === 'move-end') held = false;
		resumeAt = io.now() + 1000;
	}
	function candidates(items, settings, now) {
		const position = io.position();
		return items
			.filter(item => {
				item.distance = Math.hypot(item.position[0] - position[0], item.position[1] - position[1]);
				return (
					item.distance <= settings.range &&
					(skipped.get(item.id) || 0) <= now &&
					!settings.excluded.some(excluded => excluded.id === item.itemId) &&
					io.matches(item, settings.categories)
				);
			})
			.sort((a, b) => a.distance - b.distance || a.id - b.id);
	}
	function tick(batched = false) {
		const now = io.now(),
			settings = io.settings();
		if (!settings.enabled || !io.available()) {
			cancel();
			return false;
		}
		if (held || now < resumeAt) return false;
		const items = io.items();
		for (const [id, until] of skipped) if (until <= now) skipped.delete(id);
		if (batched && !batch) {
			batch = new Set(candidates(items, settings, now).map(item => item.id));
			deadline = now + settings.batchSeconds * 1000;
		}
		if (batched && now >= deadline) {
			cancel();
			return false;
		}
		if (active) {
			if (!items.some(item => item.id === active.id)) {
				batch?.delete(active.id);
				cancelActive();
				return true;
			}
			if (now - started < 5000 && io.chasing(active)) return true;
			if (now - started < 1000) return true;
			skipped.set(active.id, now + 5000);
			batch?.delete(active.id);
			cancelActive();
		}
		const targets = candidates(items, settings, now).filter(item => !batched || batch.has(item.id));
		if (!targets.length) {
			batch = null;
			return false;
		}
		// Reserve the turn even while the previous attack/pickup animation is finishing.
		if (io.busy()) return true;
		for (const item of targets) {
			if (!io.reachable(item)) {
				skipped.set(item.id, now + 5000);
				batch?.delete(item.id);
				continue;
			}
			active = item;
			started = now;
			io.pick(item);
			return true;
		}
		batch = null;
		return false;
	}
	return { tick: () => tick(false), takeTurn: () => tick(true), manual, cancel, destroy: cancel };
}
