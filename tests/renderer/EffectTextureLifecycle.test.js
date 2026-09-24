import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('Core/Client.js', () => ({ default: {} }));
vi.mock('Renderer/EffectTextureCache.js', () => ({ default: { acquire: vi.fn() } }));
vi.mock('Renderer/SpriteRenderer.js', () => ({ default: {} }));
vi.mock('Renderer/EntityManager.js', () => ({ default: {} }));
vi.mock('Renderer/Map/Altitude.js', () => ({ default: {} }));
vi.mock('Renderer/Camera.js', () => ({ default: {} }));
vi.mock('Renderer/Entity/Entity.js', () => ({ default: {} }));
import Cache from '../../src/Renderer/EffectTextureCache.js';
import TwoDEffect from '../../src/Renderer/Effects/TwoDEffect.js';
import ThreeDEffect from '../../src/Renderer/Effects/ThreeDEffect.js';

let requests;
beforeEach(() => {
	requests = [];
	Cache.acquire.mockImplementation((_gl, file, onload, onerror) => {
		const release = vi.fn();
		requests.push({ file, onload, onerror, release });
		return release;
	});
});
const effect = (Type, fields) => Object.assign(Object.create(Type.prototype), fields);

it('releases a 2D effect lease and clears its texture without owning the shared GPU resource', () => {
	const hit = effect(TwoDEffect, { textureName: 'effect/lens1.tga' });
	hit.init({});
	requests[0].onload({});
	expect(hit.ready).toBe(true);
	expect(requests[0].file).toBe('data/texture/effect/lens1.tga');
	hit.free({});
	hit.free({});
	expect(requests[0].release).toHaveBeenCalledOnce();
	expect(hit.texture).toBeNull();
	expect(hit.ready).toBe(false);
});

it('preserves animated texture ordering despite asynchronous completion and releases all leases', () => {
	const hit = effect(ThreeDEffect, { textureNameList: ['one', 'two', 'three'] });
	hit.init({});
	requests[2].onload('C');
	requests[0].onload('A');
	expect(hit.ready).toBe(false);
	requests[1].onload('B');
	expect(hit.ready).toBe(true);
	expect(hit.textureList).toEqual(['A', 'B', 'C']);
	hit.free({});
	for (const request of requests) expect(request.release).toHaveBeenCalledOnce();
	expect(hit.textureList).toEqual([]);
});

it('does not mark a partially failed animation ready when its remaining images arrive', () => {
	const hit = effect(ThreeDEffect, { textureNameList: ['one', 'two'] });
	hit.init({});
	requests[0].onerror();
	requests[1].onload({});
	expect(hit.ready).toBe(false);
	expect(hit.needCleanUp).toBe(true);
	hit.free({});
	for (const request of requests) expect(request.release).toHaveBeenCalledOnce();
});

it('supports synchronous cache hits and sprite-only 3D effects', () => {
	Cache.acquire.mockImplementation((_gl, _file, onload) => { onload('texture'); return vi.fn(); });
	const hit = effect(ThreeDEffect, { textureNameList: [], textureName: 'hit' });
	hit.init({});
	expect(hit.ready).toBe(true);
	expect(hit.texture).toBe('texture');
	const sprite = effect(ThreeDEffect, { textureNameList: [] });
	sprite.init({});
	expect(sprite.ready).toBe(true);
	expect(sprite.releaseTextures).toEqual([]);
});
