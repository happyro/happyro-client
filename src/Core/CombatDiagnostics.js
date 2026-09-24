/** CPU timings and actual game-frame intervals, enabled only by the debug page. */
export function createCombatDiagnostics({ sink, now = () => performance.now(), visible = () => !document.hidden }) {
	let lastFrame = 0;
	let summaryAt = 0;
	let intervals = [];
	let cpu = [];
	let spans = {};
	let recent = [];
	let slowCount = 0;
	const enabled = () => Boolean(sink()?.enabled);
	function reset() {
		lastFrame = 0;
		summaryAt = 0;
		intervals = [];
		cpu = [];
		spans = {};
		recent = [];
		slowCount = 0;
	}
	const round = value => Math.round(value * 100) / 100;
	function emit(event, details) {
		sink()?.recordPerformance(event, details);
	}
	function mark(event, details = {}) {
		if (!enabled()) return;
		const at = now();
		recent.push({ event, at });
		if (recent.length > 16) recent.shift();
		emit(event, details);
	}
	function begin() {
		return enabled() ? now() : null;
	}
	function end(name, start, details = {}) {
		if (start === null || !enabled()) return;
		const duration = now() - start;
		const stat = (spans[name] ||= { count: 0, totalMs: 0, maxMs: 0 });
		stat.count++;
		stat.totalMs += duration;
		stat.maxMs = Math.max(stat.maxMs, duration);
		if (duration >= 8 && slowCount++ < 20) emit('perf.slow', { name, durationMs: round(duration), ...details });
	}
	function beginFrame(playing) {
		if (!enabled() || !playing || !visible()) {
			reset();
			return null;
		}
		const at = now();
		if (!summaryAt) summaryAt = at;
		if (lastFrame) {
			const gap = at - lastFrame;
			if (intervals.length < 1200) intervals.push(gap);
			if (gap >= 50 && slowCount++ < 20)
				emit('perf.frame-gap', {
					intervalMs: round(gap),
					recent: recent
						.filter(item => at - item.at <= 1000)
						.map(item => ({ event: item.event, agoMs: round(at - item.at) }))
				});
		}
		lastFrame = at;
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
		if (start === null || !enabled()) return;
		const at = now();
		if (cpu.length < 1200) cpu.push(at - start);
		if (at - summaryAt < 5000) return;
		for (const stat of Object.values(spans)) {
			stat.totalMs = round(stat.totalMs);
			stat.maxMs = round(stat.maxMs);
		}
		emit('perf.summary', {
			windowMs: round(at - summaryAt),
			intervalMs: stats(intervals),
			cpuMs: stats(cpu),
			spans,
			settings,
			omittedSlowEvents: Math.max(0, slowCount - 20)
		});
		intervals = [];
		cpu = [];
		spans = {};
		slowCount = 0;
		summaryAt = at;
	}
	function playSound(sound, reused) {
		const start = begin();
		const result = sound.play();
		if (start !== null) {
			end(reused ? 'audio.play.cached' : 'audio.play.new', start);
			result?.then(
				() => end('audio.play.ready', start),
				() => end('audio.play.rejected', start)
			);
		}
		return result;
	}
	return { begin, end, mark, beginFrame, endFrame, playSound, enabled, reset };
}

const diagnostics = createCombatDiagnostics({ sink: () => window.happyroDebug });
document.addEventListener('visibilitychange', diagnostics.reset);
export default diagnostics;
