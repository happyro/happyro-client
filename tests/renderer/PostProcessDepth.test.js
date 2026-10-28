import { describe, expect, it, vi } from 'vitest';

vi.mock('Preferences/Graphics.js', () => ({ default: {} }));
import PostProcess from '../../src/Renderer/Effects/PostProcess.js';

describe('render pass depth reset', () => {
	it.each([null, { framebuffer: {}, width: 320, height: 240 }])(
		'clears stale depth after a transparent pass (%s)',
		output => {
			let writable = false;
			let depth = 0.1;
			const gl = {
				canvas: { width: 640, height: 480 },
				COLOR_BUFFER_BIT: 1,
				DEPTH_BUFFER_BIT: 2,
				bindFramebuffer: vi.fn(),
				viewport: vi.fn(),
				depthMask: value => { writable = value; },
				clear: mask => {
					if (writable && (mask & 2)) depth = 1;
				}
			};
			PostProcess.beforeRenderPass(gl, output);
			// A farther fragment from the new scene must pass the depth test.
			expect(0.8 < depth).toBe(true);
			expect(writable).toBe(true);
		}
	);
});
