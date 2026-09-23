import { beforeAll, afterAll, expect, it, vi } from 'vitest';

vi.mock('Utils/WebGL.js', () => ({ default: {} }));
vi.mock('../../src/Renderer/Camera.js', () => ({ default: {} }));

let SpriteRenderer;
beforeAll(async () => {
	vi.stubGlobal('document', {
		createElement: () => {
			const canvas = {};
			canvas.getContext = () => ({
				createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
				putImageData: image => { canvas.pixels = [...image.data]; }
			});
			return canvas;
		}
	});
	SpriteRenderer = (await import('../../src/Renderer/SpriteRenderer.js')).default;
});
afterAll(() => vi.unstubAllGlobals());

it('keeps hair and hat pixels independent even when source draws are consumed later', () => {
	const sources = [];
	const context = {
		save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
		drawImage: source => sources.push(source)
	};
	SpriteRenderer.bind2DContext(context, 0, 0);
	SpriteRenderer.size.set([1, 1]);
	SpriteRenderer.color.set([1, 1, 1, 1]);
	const hair = { width: 1, height: 1, type: 1, data: new Uint8Array([10, 20, 30, 255]) };
	const hat = { width: 1, height: 1, type: 1, data: new Uint8Array([200, 0, 0, 255]) };
	SpriteRenderer.sprite = hair;
	SpriteRenderer.render();
	SpriteRenderer.sprite = hat;
	SpriteRenderer.render();
	expect(sources[0]).not.toBe(sources[1]);
	expect(sources[0].pixels).toEqual([10, 20, 30, 255]);
	expect(sources[1].pixels).toEqual([200, 0, 0, 255]);
	SpriteRenderer.sprite = hair;
	SpriteRenderer.render();
	expect(sources[2]).toBe(sources[0]);
});

it('does not rewrite unchanged frames or share sources between character slots', () => {
	const sources = [];
	const makeContext = () => ({
		save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
		drawImage: source => sources.push(source)
	});
	const first = makeContext();
	const second = makeContext();
	SpriteRenderer.sprite = { width: 1, height: 1, type: 1, data: new Uint8Array([100, 50, 20, 255]) };
	SpriteRenderer.color.set([1, 1, 1, 1]);
	SpriteRenderer.bind2DContext(first, 0, 0);
	SpriteRenderer.render();
	const pixels = sources[0].pixels;
	SpriteRenderer.render();
	expect(sources[1]).toBe(sources[0]);
	expect(sources[1].pixels).toBe(pixels);
	SpriteRenderer.bind2DContext(second, 0, 0);
	SpriteRenderer.render();
	expect(sources[2]).not.toBe(sources[0]);
	SpriteRenderer.bind2DContext(first, 0, 0);
	SpriteRenderer.color.set([0.5, 1, 1, 1]);
	SpriteRenderer.render();
	expect(sources[3]).not.toBe(sources[0]);
	expect(sources[0].pixels).toEqual([100, 50, 20, 255]);
	expect(sources[3].pixels).toEqual([50, 50, 20, 255]);
});

it('replaces indexed palette images without changing a previously drawn source', () => {
	const sources = [];
	SpriteRenderer.bind2DContext({
		save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
		drawImage: source => sources.push(source)
	}, 0, 0);
	SpriteRenderer.sprite = { width: 1, height: 1, type: 0, data: new Uint8Array([1]) };
	SpriteRenderer.color.set([1, 1, 1, 1]);
	SpriteRenderer.palette = new Uint8Array([0, 0, 0, 0, 255, 0, 0, 255]);
	SpriteRenderer.render();
	SpriteRenderer.palette = new Uint8Array([0, 0, 0, 0, 0, 0, 255, 255]);
	SpriteRenderer.render();
	expect(sources[0].pixels).toEqual([255, 0, 0, 255]);
	expect(sources[1].pixels).toEqual([0, 0, 255, 255]);
});
