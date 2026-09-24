import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
	preferences: { Sound: { play: true, volume: 0.5 }, save: vi.fn() },
	player: null,
	session: { Entity: { position: [10, 10] } },
	loadFile: vi.fn()
}));
vi.mock('Preferences/Audio.js', () => ({ default: state.preferences }));
vi.mock('Engine/SessionStorage.js', () => ({ default: state.session }));
vi.mock('Core/Client.js', () => ({ default: { loadFile: state.loadFile } }));
vi.mock('../../src/Audio/BufferSoundPlayer.js', () => ({ default: class {
	constructor(options) {
		this.options = options;
		this.context = {};
		for (const name of ['play', 'preload', 'setVolume', 'stop', 'activate', 'suspend']) this[name] = vi.fn();
		state.player = this;
	}
} }));
import Sound from '../../src/Audio/SoundManager.js';
beforeEach(() => { vi.clearAllMocks(); state.preferences.Sound = { play: true, volume: 0.5 }; });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('preserves the saved volume while toggling sound off and back on', () => {
	state.preferences.Sound.play = false;
	Sound.setVolume(0.7);
	expect(state.preferences.Sound.volume).toBe(0.7);
	expect(state.player.setVolume).toHaveBeenLastCalledWith(0);
	Sound.play('hit.wav');
	expect(state.player.play).not.toHaveBeenCalled();
	state.preferences.Sound.play = true;
	Sound.setVolume(state.preferences.Sound.volume);
	expect(state.player.setVolume).toHaveBeenLastCalledWith(0.7);
});

it('marks local-player sounds as priority and keeps distance attenuation', () => {
	Sound.playPosition('hit.wav', state.session.Entity.position);
	expect(state.player.play).toHaveBeenLastCalledWith('hit.wav', 0.96875, true);
	Sound.playPosition('other.wav', [35, 10]);
	expect(state.player.play).toHaveBeenLastCalledWith('other.wav', 0.1, false);
});

it('uses gestures to activate audio and silences hidden pages until they return', () => {
	document.dispatchEvent(new Event('pointerup'));
	expect(state.player.activate).toHaveBeenCalledOnce();
	const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
	document.dispatchEvent(new Event('visibilitychange'));
	expect(state.player.suspend).toHaveBeenCalledOnce();
	Sound.play('background.wav');
	expect(state.player.play).not.toHaveBeenCalled();
	hidden.mockReturnValue(false);
	document.dispatchEvent(new Event('visibilitychange'));
	expect(state.player.activate).toHaveBeenCalledTimes(2);
});

it('loads the worker-resolved sound as binary data and reports missing resources', async () => {
	state.loadFile.mockImplementation((filename, done) => done('http://example.test/hit.wav'));
	const data = new ArrayBuffer(44);
	const fetch = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => data });
	vi.stubGlobal('fetch', fetch);
	expect(await state.player.options.load('hit.wav')).toBe(data);
	expect(state.loadFile).toHaveBeenCalledWith('data/wav/hit.wav', expect.any(Function), expect.any(Function));
	fetch.mockResolvedValue({ ok: false, status: 404 });
	await expect(state.player.options.load('hit.wav')).rejects.toThrow('Sound HTTP 404');
});
