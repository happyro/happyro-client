/** Synchronous elapsed timings and actual game-frame intervals; debug pages only. */
export function createCombatDiagnostics({ sink, now = () => performance.now(), visible = () => !document.hidden }) {
	let lastFrame = null;
	let summaryAt = null;
	let intervals = [];
	let cpu = [];
	let spans = {};
	let counters = {};
	let recent = [];
	let detailCount = 0;
	let omitted = 0;
	let sequence = 0;
	let combatSequence = 0;
	let inFrame = false;
	let frameId = 0;
	let frameCpuMs = 0;
	const frameSpans = {};
	const outsideSpans = {};
	const frameCounters = {};
	const outsideCounters = {};
	const enabled = () => Boolean(sink()?.enabled);
	const round = value => Math.round(value * 100) / 100;
	function clear(bucket) {
		for (const key in bucket) {
			const stat = bucket[key];
			if (typeof stat === 'number') bucket[key] = 0;
			else {
				stat.count = 0;
				stat.totalMs = 0;
				stat.maxMs = 0;
				delete stat.details;
			}
		}
	}
	function reset() {
		lastFrame = summaryAt = null;
		intervals = [];
		cpu = [];
		spans = {};
		counters = {};
		recent = [];
		detailCount = omitted = 0;
		inFrame = false;
		frameCpuMs = 0;
		clear(frameSpans);
		clear(outsideSpans);
		clear(frameCounters);
		clear(outsideCounters);
	}
	function emit(event, details) {
		sink()?.recordPerformance(event, details);
	}
	function detail(event, details) {
		if (detailCount >= 20) {
			omitted++;
			return;
		}
		detailCount++;
		emit(event, typeof details === 'function' ? details() : details);
	}
	function nearby(at) {
		return recent
			.filter(item => at - item.at <= 1000)
			.slice(-8)
			.map(({ at: tick, ...item }) => ({ ...item, agoMs: round(at - tick) }));
	}
	function mark(event, details = {}) {
		if (!enabled()) return;
		const at = now();
		const combatId = ++combatSequence;
		recent.push({ event, at, combatId, ...details });
		if (recent.length > 16) recent.shift();
		emit(event, { ...details, combatId, frameId: inFrame ? frameId : null });
	}
	function begin() {
		return enabled() ? now() : null;
	}
	function addSpan(bucket, name, duration, details) {
		if (!bucket[name] && Object.keys(bucket).length >= 40) return;
		const stat = (bucket[name] ||= { count: 0, totalMs: 0, maxMs: 0 });
		stat.count++;
		stat.totalMs += duration;
		if (duration >= stat.maxMs) {
			stat.maxMs = duration;
			if (duration >= 8 && details) stat.details = typeof details === 'function' ? details() : details;
		}
	}
	function end(name, start, details) {
		if (start === null || !enabled()) return null;
		const at = now();
		const duration = at - start;
		addSpan(spans, name, duration);
		// Promise completion measures waiting, not synchronous work in this frame.
		if (!name.endsWith('.wait')) {
			addSpan(inFrame ? frameSpans : outsideSpans, name, duration, details);
			if (duration >= 8 && !inFrame)
				detail('perf.slow', () => ({
					name,
					durationMs: round(duration),
					afterFrameId: lastFrame === null ? null : frameId,
					...(typeof details === 'function' ? details() : details)
				}));
		}
		return at;
	}
	function addCount(bucket, name, amount) {
		if (!(name in bucket) && Object.keys(bucket).length >= 20) return;
		bucket[name] = (bucket[name] || 0) + amount;
	}
	function count(name, amount = 1) {
		if (!enabled()) return;
		addCount(counters, name, amount);
		addCount(inFrame ? frameCounters : outsideCounters, name, amount);
	}
	function hotSpans(bucket) {
		return Object.entries(bucket)
			.filter(([, stat]) => stat.count && stat.totalMs > 0)
			.sort((a, b) => b[1].totalMs - a[1].totalMs)
			.slice(0, 8)
			.map(([name, stat]) => ({
				name,
				count: stat.count,
				totalMs: round(stat.totalMs),
				maxMs: round(stat.maxMs),
				...(stat.details ? { details: stat.details } : {})
			}));
	}
	function activeCounts(bucket) {
		return Object.fromEntries(Object.entries(bucket).filter(([, value]) => value));
	}
	function frameSnapshot() {
		return {
			frameId,
			cpuMs: round(frameCpuMs),
			spans: hotSpans(frameSpans),
			counters: activeCounts(frameCounters)
		};
	}
	function beginFrame(playing) {
		if (!enabled() || !playing || !visible()) {
			reset();
			return null;
		}
		const at = now();
		if (summaryAt === null) summaryAt = at;
		if (lastFrame !== null) {
			const gap = at - lastFrame;
			if (intervals.length < 1200) intervals.push(gap);
			if (gap >= 50)
				detail('perf.frame-gap', () => ({
					frameId: sequence + 1,
					intervalMs: round(gap),
					previousFrame: frameSnapshot(),
					outsideRenderMs: round(Math.max(0, gap - frameCpuMs)),
					betweenFrames: { spans: hotSpans(outsideSpans), counters: activeCounts(outsideCounters) },
					recent: nearby(at)
				}));
		}
		clear(frameSpans);
		clear(outsideSpans);
		clear(frameCounters);
		clear(outsideCounters);
		lastFrame = at;
		frameId = ++sequence;
		frameCpuMs = 0;
		inFrame = true;
		return at;
	}
	function stats(values) {
		if (!values.length) return { count: 0 };
		const sorted = [...values].sort((a, b) => a - b);
		return {
			count: values.length,
			p50: round(sorted[Math.ceil(sorted.length * 0.5) - 1]),
			p95: round(sorted[Math.ceil(sorted.length * 0.95) - 1]),
			p99: round(sorted[Math.ceil(sorted.length * 0.99) - 1]),
			max: round(sorted.at(-1)),
			over50: values.filter(value => value >= 50).length
		};
	}
	function endFrame(start, settings) {
		if (start === null || !enabled()) {
			inFrame = false;
			return;
		}
		const at = now();
		frameCpuMs = at - start;
		inFrame = false;
		if (cpu.length < 1200) cpu.push(frameCpuMs);
		if (frameCpuMs >= 32) detail('perf.frame', () => ({ ...frameSnapshot(), recent: nearby(at) }));
		if (at - summaryAt < 5000) return;
		for (const stat of Object.values(spans)) {
			stat.totalMs = round(stat.totalMs);
			stat.maxMs = round(stat.maxMs);
		}
		emit('perf.summary', {
			profileVersion: 2,
			frameId,
			windowMs: round(at - summaryAt),
			intervalMs: stats(intervals),
			cpuMs: stats(cpu),
			spans,
			counters,
			settings,
			omittedSlowEvents: omitted
		});
		intervals = [];
		cpu = [];
		spans = {};
		counters = {};
		detailCount = omitted = 0;
		summaryAt = at;
	}
	return { begin, end, count, mark, beginFrame, endFrame, enabled, reset };
}

const diagnostics = createCombatDiagnostics({ sink: () => window.happyroDebug });
document.addEventListener('visibilitychange', diagnostics.reset);
export default diagnostics;
