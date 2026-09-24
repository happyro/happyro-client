import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('Core/Client.js', () => ({ default: { loadFile: vi.fn() } }));
vi.mock('Core/Configs.js', () => ({ default: { get: vi.fn() } }));
vi.mock('Core/CombatDiagnostics.js', () => ({ default: { begin: () => null, end: vi.fn(), count: vi.fn() } }));
vi.mock('Utils/Texture.js', () => ({ default: { load: vi.fn() } }));
vi.mock('Utils/WebGL.js', () => ({ imageTexture: vi.fn() }));
import Client from '../../src/Core/Client.js';
import Configs from '../../src/Core/Configs.js';
import Texture from '../../src/Utils/Texture.js';
import { imageTexture } from '../../src/Utils/WebGL.js';
import { createEffectTextureCache } from '../../src/Renderer/EffectTextureCache.js';

const context = () => ({ canvas: document.createElement('canvas'), isContextLost: vi.fn(() => false), deleteTexture: vi.fn() });
let gl, cache;
beforeEach(() => {
	vi.resetAllMocks();
	gl = context();
	cache = createEffectTextureCache();
	Configs.get.mockReturnValue(false);
	Client.loadFile.mockImplementation((_file, done) => done(new ArrayBuffer(8)));
	Texture.load.mockImplementation((_buffer, done) => done.call({ width: 16, height: 16 }, true));
	imageTexture.mockImplementation(() => ({ texture: {}, bytes: 1024 }));
});

it('uploads only three images for twenty hit instances and reuses them on later attacks', () => {
	const files = [...Array(4).fill('pok3.tga'), ...Array(8).fill('lens1.tga'), ...Array(8).fill('lens2.tga')];
	for (let attack = 0; attack < 10; attack++) {
		const textures = new Map();
		const releases = files.map(file => cache.acquire(gl, file, texture => {
			if (textures.has(file)) expect(texture).toBe(textures.get(file));
			textures.set(file, texture);
		}, vi.fn()));
		expect(textures.size).toBe(3);
		releases.forEach(release => release());
	}
	expect(Client.loadFile).toHaveBeenCalledTimes(3);
	expect(Texture.load).toHaveBeenCalledTimes(3);
	expect(imageTexture).toHaveBeenCalledTimes(3);
	expect(gl.deleteTexture).not.toHaveBeenCalled();
	cache.clear(gl);
	expect(gl.deleteTexture).toHaveBeenCalledTimes(3);
});

it('merges pending loads and does not revive an effect released before completion', () => {
	let complete;
	Client.loadFile.mockImplementation((_file, done) => { complete = done; });
	const expired = vi.fn(), alive = vi.fn();
	cache.acquire(gl, 'hit.tga', expired, vi.fn())();
	const release = cache.acquire(gl, 'hit.tga', alive, vi.fn());
	complete(new ArrayBuffer(8));
	expect(Client.loadFile).toHaveBeenCalledOnce();
	expect(imageTexture).toHaveBeenCalledOnce();
	expect(expired).not.toHaveBeenCalled();
	expect(alive).toHaveBeenCalledOnce();
	release();
	release();
	cache.clear(gl);
	expect(gl.deleteTexture).toHaveBeenCalledOnce();
});

it('preloads an image once and shares the result with concurrent and later effects', () => {
	let complete;
	Client.loadFile.mockImplementation((_file, done) => { complete = done; });
	cache.preload(gl, 'hit.tga');
	const ready = vi.fn();
	cache.acquire(gl, 'hit.tga', ready, vi.fn());
	complete(new ArrayBuffer(8));
	cache.acquire(gl, 'hit.tga', ready, vi.fn());
	expect(ready).toHaveBeenCalledTimes(2);
	expect(ready.mock.calls[0][0]).toBe(ready.mock.calls[1][0]);
	expect(imageTexture).toHaveBeenCalledOnce();
});

it('evicts the least recently used idle texture without deleting a live texture', () => {
	cache = createEffectTextureCache({ maxEntries: 2 });
	const active = vi.fn(), oldest = vi.fn(), newest = vi.fn();
	const release = cache.acquire(gl, 'active', active, vi.fn());
	cache.acquire(gl, 'oldest', oldest, vi.fn())();
	cache.acquire(gl, 'newest', newest, vi.fn())();
	expect(gl.deleteTexture).toHaveBeenCalledExactlyOnceWith(oldest.mock.calls[0][0]);
	expect(gl.deleteTexture.mock.calls[0][0]).not.toBe(active.mock.calls[0][0]);
	release();
	cache.clear(gl);
	expect(gl.deleteTexture).toHaveBeenCalledTimes(3);
});

it('reclaims memory over the byte budget when the last active lease ends', () => {
	cache = createEffectTextureCache({ maxBytes: 512 });
	const release1 = cache.acquire(gl, 'large', vi.fn(), vi.fn());
	const release2 = cache.acquire(gl, 'large', vi.fn(), vi.fn());
	expect(gl.deleteTexture).not.toHaveBeenCalled();
	release1();
	expect(gl.deleteTexture).not.toHaveBeenCalled();
	release2();
	expect(gl.deleteTexture).toHaveBeenCalledOnce();
	cache.acquire(gl, 'large', vi.fn(), vi.fn());
	expect(imageTexture).toHaveBeenCalledTimes(2);
});

it('keeps contexts and mipmap settings separate, capturing settings before asynchronous loading', () => {
	const complete = [];
	Client.loadFile.mockImplementation((_file, done) => complete.push(done));
	cache.acquire(gl, 'hit', vi.fn(), vi.fn());
	Configs.get.mockReturnValue(true);
	cache.acquire(gl, 'hit', vi.fn(), vi.fn());
	const other = context();
	cache.acquire(other, 'hit', vi.fn(), vi.fn());
	complete.forEach(done => done(new ArrayBuffer(8)));
	expect(imageTexture.mock.calls.map(([ctx, , mipmap]) => [ctx === gl, mipmap])).toEqual([[true, false], [true, true], [false, true]]);
	cache.clear(gl);
	expect(gl.deleteTexture).toHaveBeenCalledTimes(2);
	expect(other.deleteTexture).not.toHaveBeenCalled();
});

it('ignores pending callbacks after map cleanup, including when the same filename is requested again', () => {
	const pending = [];
	Client.loadFile.mockImplementation((_file, done) => pending.push(done));
	const oldReady = vi.fn(), oldError = vi.fn(), newReady = vi.fn();
	cache.acquire(gl, 'hit', oldReady, oldError);
	cache.clear(gl);
	cache.acquire(gl, 'hit', newReady, vi.fn());
	pending[0](new ArrayBuffer(8));
	expect(imageTexture).not.toHaveBeenCalled();
	pending[1](new ArrayBuffer(8));
	expect(oldReady).not.toHaveBeenCalled();
	expect(oldError).toHaveBeenCalledOnce();
	expect(newReady).toHaveBeenCalledOnce();
});

it('invalidates live and pending textures on context loss and uploads fresh textures after restoration', () => {
	const ready = vi.fn(), failed = vi.fn();
	cache.acquire(gl, 'ready', ready, failed);
	let complete;
	Client.loadFile.mockImplementation((_file, done) => { complete = done; });
	cache.acquire(gl, 'pending', ready, failed);
	gl.isContextLost.mockReturnValue(true);
	gl.canvas.dispatchEvent(new Event('webglcontextlost'));
	complete(new ArrayBuffer(8));
	expect(failed).toHaveBeenCalledTimes(2);
	expect(gl.deleteTexture).not.toHaveBeenCalled();
	expect(imageTexture).toHaveBeenCalledOnce();
	gl.isContextLost.mockReturnValue(false);
	cache.acquire(gl, 'ready', ready, failed);
	complete(new ArrayBuffer(8));
	expect(imageTexture).toHaveBeenCalledTimes(2);
	expect(ready.mock.calls[0][0]).not.toBe(ready.mock.calls[1][0]);
});

it('fails every waiting lease on a missing file and allows a later retry', () => {
	let fail;
	Client.loadFile.mockImplementation((_file, _done, error) => { fail = error; });
	const error = vi.fn();
	cache.acquire(gl, 'missing', vi.fn(), error);
	cache.acquire(gl, 'missing', vi.fn(), error);
	fail();
	expect(error).toHaveBeenCalledTimes(2);
	cache.acquire(gl, 'missing', vi.fn(), error);
	expect(Client.loadFile).toHaveBeenCalledTimes(2);
});

it('removes failed image decodes instead of caching an unusable texture', () => {
	Texture.load.mockImplementation((_buffer, done) => done(false));
	const error = vi.fn();
	cache.acquire(gl, 'bad', vi.fn(), error);
	cache.acquire(gl, 'bad', vi.fn(), error);
	expect(error).toHaveBeenCalledTimes(2);
	expect(imageTexture).not.toHaveBeenCalled();
});

it('ignores a decoded image that completes after cleanup', () => {
	let decoded;
	Texture.load.mockImplementation((_buffer, done) => { decoded = done; });
	const ready = vi.fn();
	cache.acquire(gl, 'late.png', ready, vi.fn());
	cache.clear(gl);
	decoded.call({ width: 16, height: 16 }, true);
	expect(imageTexture).not.toHaveBeenCalled();
	expect(ready).not.toHaveBeenCalled();
});

it('fails the lease after an upload exception and permits a fresh upload', () => {
	const log = vi.spyOn(console, 'error').mockImplementation(() => {});
	try {
		imageTexture.mockImplementationOnce(() => { throw new Error('upload failed'); });
		const ready = vi.fn(), failed = vi.fn();
		cache.acquire(gl, 'retry', ready, failed);
		expect(failed).toHaveBeenCalledOnce();
		expect(ready).not.toHaveBeenCalled();
		cache.acquire(gl, 'retry', ready, failed);
		expect(ready).toHaveBeenCalledOnce();
	} finally {
		log.mockRestore();
	}
});
