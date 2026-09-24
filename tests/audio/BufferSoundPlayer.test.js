import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import BufferSoundPlayer from '../../src/Audio/BufferSoundPlayer.js';

let player, context, clock, load;
const deferred = () => {
	let resolve, reject;
	const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
	return { promise, resolve, reject };
};
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

beforeEach(async () => {
	clock = 0;
	class TestContext {
		constructor() {
			context = this;
			this.state = 'suspended';
			this.destination = {};
			this.sources = [];
			this.resume = vi.fn(async () => { this.state = 'running'; });
			this.suspend = vi.fn(async () => { this.state = 'suspended'; });
			this.decodeAudioData = vi.fn(async () => ({ length: 4800, numberOfChannels: 1 }));
		}
		createGain() { return { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }; }
		createBufferSource() {
			const source = { buffer: null, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() };
			this.sources.push(source);
			return source;
		}
	}
	vi.stubGlobal('AudioContext', vi.fn(function () { return new TestContext(); }));
	load = vi.fn(async () => new ArrayBuffer(44));
	player = new BufferSoundPlayer({ load, now: () => clock, diagnostics: { begin: () => null, end: vi.fn(), mark: vi.fn() } });
	await player.activate();
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('predecodes once and plays a 70ms attack sequence from one shared buffer and context', async () => {
	player.preload('attack.wav');
	await flush();
	for (let i = 0; i < 20; i++) {
		clock += 70;
		player.play('attack.wav', 1, true);
		context.sources.at(-1).onended();
	}
	expect(load).toHaveBeenCalledOnce();
	expect(context.decodeAudioData).toHaveBeenCalledOnce();
	expect(AudioContext).toHaveBeenCalledOnce();
	expect(context.sources).toHaveLength(20);
	expect(context.sources.every(s => s.start.mock.calls.length === 1 && s.disconnect.mock.calls.length === 1)).toBe(true);
	expect(player.voices.size).toBe(0);
});

it('coalesces cold triggers and applies the same duplicate limit to decoded sounds', async () => {
	const loading = deferred(); load.mockReturnValue(loading.promise);
	for (let i = 0; i < 20; i++) player.play('attack.wav');
	expect(load).toHaveBeenCalledOnce();
	loading.resolve(new ArrayBuffer(44)); await flush();
	expect(context.sources).toHaveLength(1);
	player.play('attack.wav');
	expect(context.sources).toHaveLength(1);
	clock = 70; player.play('attack.wav');
	expect(context.sources).toHaveLength(2);
});

it('does not replay an obsolete attack after slow loading, but keeps its prepared buffer', async () => {
	const loading = deferred(); load.mockReturnValue(loading.promise);
	player.play('attack.wav'); clock = 1000;
	loading.resolve(new ArrayBuffer(44)); await flush();
	expect(context.sources).toHaveLength(0);
	player.play('attack.wav');
	expect(context.sources).toHaveLength(1);
	expect(load).toHaveBeenCalledOnce();
});

it('cancels pending playback on map changes and stops only the requested sound', async () => {
	const loading = deferred(); load.mockReturnValueOnce(loading.promise);
	player.play('old-map.wav'); player.stop();
	loading.resolve(new ArrayBuffer(44)); await flush();
	expect(context.sources).toHaveLength(0);
	player.play('old-map.wav'); player.play('new-map.wav'); await flush();
	player.stop('old-map.wav');
	expect(context.sources[0].stop).toHaveBeenCalledOnce();
	expect(context.sources[1].stop).not.toHaveBeenCalled();
	player.stop();
	expect(player.voices.size).toBe(0);
	expect(context.sources[1].buffer).toBeNull();
});

it('keeps distance attenuation separate from master volume updates', async () => {
	player.setVolume(0.5); player.play('hit.wav', 0.25); await flush();
	const voice = [...player.voices][0];
	expect(voice.gain.gain.value * player.output.gain.value).toBe(0.125);
	player.setVolume(0.8);
	expect(voice.gain.gain.value * player.output.gain.value).toBe(0.2);
});

it('bounds overlapping sounds and reserves playback for the local player', async () => {
	player.preload('hit.wav'); await flush();
	for (let i = 0; i < 20; i++) { clock += 40; player.play('hit.wav'); }
	expect(player.voices.size).toBe(8);
	player.play('hit.wav', 1, true);
	expect(player.voices.size).toBe(8);
	expect(context.sources[0].stop).toHaveBeenCalledOnce();
	expect([...player.voices].some(v => v.priority)).toBe(true);
	for (let i = 0; i < 40; i++) { player.play(`other-${i}.wav`); await flush(); }
	expect(player.voices.size).toBe(32);
});

it('evicts unused decoded buffers while keeping playing sounds within the cache budget', async () => {
	context.decodeAudioData.mockImplementation(async () => ({ length: 4 * 1024 * 1024, numberOfChannels: 1 }));
	player.play('active.wav'); await flush();
	player.preload('old.wav'); await flush();
	player.preload('new.wav'); await flush();
	expect(player.cache.has('active.wav')).toBe(true);
	expect(player.cache.has('old.wav')).toBe(false);
	expect(player.cacheBytes).toBe(32 * 1024 * 1024);
});

it('bounds concurrent loading and continues the queue after a failed resource', async () => {
	const loads = [];
	load.mockImplementation(() => { const item = deferred(); loads.push(item); return item.promise; });
	for (let i = 0; i < 10; i++) player.preload(`sound-${i}.wav`);
	expect(load).toHaveBeenCalledTimes(4);
	loads[0].reject(new Error('missing')); await flush();
	expect(load).toHaveBeenCalledTimes(5);
	player.preload('sound-0.wav');
	expect(load.mock.calls.filter(([name]) => name === 'sound-0.wav')).toHaveLength(1);
});

it('drops old sounds on backgrounding and resumes fresh sounds without rebuilding the context', async () => {
	player.play('hit.wav'); await flush();
	await player.suspend();
	expect(context.sources[0].stop).toHaveBeenCalledOnce();
	player.play('hit.wav');
	await player.activate();
	expect(context.sources).toHaveLength(1);
	player.play('hit.wav');
	expect(context.sources).toHaveLength(2);
	expect(AudioContext).toHaveBeenCalledOnce();
	context.state = 'interrupted'; context.onstatechange();
	expect(player.voices.size).toBe(0);
});

it('allows a new user gesture to retry an earlier blocked resume', async () => {
	context.state = 'suspended';
	context.resume.mockReturnValueOnce(new Promise(() => {}));
	player.activate();
	await player.activate();
	expect(context.resume).toHaveBeenCalledTimes(3);
	expect(context.state).toBe('running');
});
