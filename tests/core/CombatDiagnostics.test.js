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

it('pairs a long interval with the previous frame and separates work between frames', () => {
	let clock = 100;
	const records = [];
	const profiler = createCombatDiagnostics({ sink: () => ({ enabled: true, recordPerformance: (event, details) => records.push({ event, ...details }) }), now: () => clock, visible: () => true });
	const frame = profiler.beginFrame(true);
	profiler.mark('combat.attack', { self: true, kind: 10, attackMs: 70 });
	const stage = profiler.begin();
	clock += 45;
	profiler.end('effect.init', stage, () => ({ type: 'HitEffect' }));
	profiler.count('memory.checked', 5);
	profiler.endFrame(frame, {});
	const outside = profiler.begin();
	clock += 12;
	profiler.end('texture.spriteUpload', outside);
	profiler.count('texture.spriteFrames', 20);
	clock += 8;
	profiler.beginFrame(true);
	const slow = records.find(row => row.event === 'perf.frame');
	const gap = records.find(row => row.event === 'perf.frame-gap');
	expect(slow).toMatchObject({ frameId: 1, cpuMs: 45, counters: { 'memory.checked': 5 } });
	expect(gap).toMatchObject({ frameId: 2, intervalMs: 65, outsideRenderMs: 20, previousFrame: { frameId: 1, cpuMs: 45, spans: [{ name: 'effect.init', maxMs: 45, details: { type: 'HitEffect' } }] }, betweenFrames: { spans: [{ name: 'texture.spriteUpload', maxMs: 12 }], counters: { 'texture.spriteFrames': 20 } } });
	expect(gap.recent[0]).toMatchObject({ combatId: 1, kind: 10, attackMs: 70, agoMs: 65 });
	clock += 2;
	profiler.endFrame(165, {});
	clock += 60;
	profiler.beginFrame(true);
	const next = records.filter(row => row.event === 'perf.frame-gap').at(-1);
	expect(next.previousFrame.spans).toEqual([]);
	expect(next.betweenFrames.spans).toEqual([]);
	expect(next.previousFrame.counters).toEqual({});
});

it('keeps async waits out of synchronous frame attribution and resets hidden-page history', () => {
	let clock = 0, visible = true;
	const records = [];
	const profiler = createCombatDiagnostics({ sink: () => ({ enabled: true, recordPerformance: (event, details) => records.push({ event, ...details }) }), now: () => clock, visible: () => visible });
	const pending = profiler.begin();
	const frame = profiler.beginFrame(true);
	clock = 60;
	profiler.end('audio.decode.wait', pending);
	profiler.endFrame(frame, {});
	clock = 70;
	profiler.beginFrame(true);
	expect(records.find(row => row.event === 'perf.frame-gap').previousFrame.spans).toEqual([]);
	visible = false;
	profiler.beginFrame(true);
	visible = true;
	clock = 10000;
	const count = records.length;
	profiler.beginFrame(true);
	expect(records).toHaveLength(count);
});

it('bounds detailed events and payload sizes while preserving window totals', () => {
	let clock = 0;
	const records = [];
	const profiler = createCombatDiagnostics({ sink: () => ({ enabled: true, recordPerformance: (event, details) => records.push({ event, ...details }) }), now: () => clock, visible: () => true });
	for (let i = 0; i < 100; i++) {
		const frame = profiler.beginFrame(true);
		for (let j = 0; j < 40; j++) {
			const start = profiler.begin(); clock++;
			profiler.end(`map.stage${j}`, start);
		}
		for (let j = 0; j < 20; j++) profiler.count(`counter${j}`);
		profiler.endFrame(frame, { sound: true });
		clock += 20;
	}
	const summaryIndex = records.findIndex(row => row.event === 'perf.summary');
	expect(summaryIndex).toBe(20);
	const summary = records[summaryIndex];
	expect(summary.omittedSlowEvents).toBeGreaterThan(0);
	expect(summary.spans['map.stage0'].count).toBeGreaterThan(80);
	expect(summary.counters.counter0).toBe(summary.spans['map.stage0'].count);
	expect(summary.profileVersion).toBe(2);
	for (const row of records) expect(new TextEncoder().encode(JSON.stringify(row)).length).toBeLessThan(7900);
});
