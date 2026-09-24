import { expect, it, vi } from 'vitest';
import { createCombatDiagnostics } from '../../src/Core/CombatDiagnostics.js';

it('does no timing work with diagnostics disabled', async () => {
	const now = vi.fn();
	const profiler = createCombatDiagnostics({ sink: () => undefined, now });
	expect(profiler.begin()).toBeNull();
	expect(profiler.beginFrame(true)).toBeNull();
	profiler.end('audio.start', null);
	expect(now).not.toHaveBeenCalled();
});

it('correlates an actual long frame with combat and records separate CPU and span costs', () => {
	let clock = 100;
	const recordPerformance = vi.fn();
	const profiler = createCombatDiagnostics({ sink: () => ({ enabled: true, recordPerformance }), now: () => clock, visible: () => true });
	let frame = profiler.beginFrame(true);
	clock += 4;
	profiler.endFrame(frame, {});
	profiler.mark('combat.attack', { self: true });
	const texture = profiler.begin();
	clock += 80;
	profiler.end('damage.texture', texture);
	frame = profiler.beginFrame(true);
	clock += 3;
	profiler.endFrame(frame, {});
	const gap = recordPerformance.mock.calls.find(([event]) => event === 'perf.frame-gap')[1];
	expect(gap.intervalMs).toBe(84);
	expect(gap.recent[0].event).toBe('combat.attack');
	clock = 5200;
	frame = profiler.beginFrame(true);
	clock += 2;
	profiler.endFrame(frame, { quality: 50 });
	const summary = recordPerformance.mock.calls.find(([event]) => event === 'perf.summary')[1];
	expect(summary.spans['damage.texture'].maxMs).toBe(80);
	expect(summary.cpuMs.max).toBe(4);
	expect(summary.settings.quality).toBe(50);
});

it('does not interpret time spent outside gameplay as a dropped game frame', () => {
	let clock = 100;
	const recordPerformance = vi.fn();
	const profiler = createCombatDiagnostics({ sink: () => ({ enabled: true, recordPerformance }), now: () => clock, visible: () => true });
	profiler.beginFrame(true);
	clock = 200;
	profiler.beginFrame(false);
	clock = 60000;
	profiler.beginFrame(true);
	expect(recordPerformance).not.toHaveBeenCalled();
});
