import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('Core/Client.js', () => ({ default: { loadFile: vi.fn() } }));
vi.mock('Utils/WebGL.js', () => ({ default: {} }));
import Client from '../../src/Core/Client.js';
import StrEffect from '../../src/Renderer/Effects/StrEffect.js';

let layer;
beforeEach(() => {
	layer = {
		texcnt: 1, materials: new Array(1), anikeynum: 1,
		animations: [{frame: 0, type: 0, aniframe: 0, angle: 0, srcalpha: 1, destalpha: 1,
			color: [1, 1, 1, 1], pos: [320, 320], uv: new Array(8).fill(0), xy: new Array(8).fill(0)}]
	};
	Client.loadFile.mockReturnValue({fps: 30, maxKey: 15, layernum: 1, layers: [layer]});
});

it('draws a short cold-cache effect after textures arrive and then expires normally', () => {
	const effect = new StrEffect('sample.str', [0, 0, 0], 1000, '');
	effect.renderAnimation = vi.fn();
	effect.render({}, 2000); // Loading took longer than the entire 500ms animation.
	expect(effect.needCleanUp).not.toBe(true);
	expect(effect.renderAnimation).not.toHaveBeenCalled();
	layer.materials[0] = {};
	effect.render({}, 2100);
	expect(effect.renderAnimation).toHaveBeenCalledOnce();
	expect(effect.startTick).toBe(2100);
	effect.render({}, 2600);
	expect(effect.needCleanUp).toBe(true);
});

it('keeps future start times and persistent-effect phase timing', () => {
	layer.materials[0] = {};
	const scheduled = new StrEffect('sample.str', [0, 0, 0], 3000, '');
	scheduled.renderAnimation = vi.fn();
	scheduled.render({}, 2000);
	expect(scheduled.startTick).toBe(3000);
	expect(scheduled.renderAnimation).not.toHaveBeenCalled();
	const persistent = new StrEffect('sample.str', [0, 0, 0], 1000, '');
	persistent._Params = {Inst: {persistent: true}};
	persistent.renderAnimation = vi.fn();
	persistent.render({}, 2000);
	expect(persistent.startTick).toBe(1000);
});

it('cleans up an effect whose textures never become available', () => {
	const effect = new StrEffect('missing-texture.str', [0, 0, 0], 1000, '');
	effect.render({}, 16001);
	expect(effect.needCleanUp).toBe(true);
});
