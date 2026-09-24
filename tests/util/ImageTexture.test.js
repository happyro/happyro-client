import { afterEach, expect, it, vi } from 'vitest';
vi.mock('Utils/Texture.js', () => ({ default: {} }));
vi.mock('Core/Configs.js', () => ({ default: {} }));
vi.mock('Core/CombatDiagnostics.js', () => ({ default: { begin: () => null, end: vi.fn() } }));
import { imageTexture } from '../../src/Utils/WebGL.js';
afterEach(() => vi.restoreAllMocks());

function context() {
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() });
	return { createTexture: vi.fn(() => ({})), bindTexture: vi.fn(), texImage2D: vi.fn(), texParameteri: vi.fn(), generateMipmap: vi.fn(), deleteTexture: vi.fn() };
}

it('preserves power-of-two image sizing and accounts for mipmap storage', () => {
	const gl = context();
	const plain = imageTexture(gl, { width: 30, height: 12 }, false);
	expect(plain.bytes).toBe(32 * 16 * 4);
	const uploaded = gl.texImage2D.mock.calls[0][5];
	expect([uploaded.width, uploaded.height]).toEqual([32, 16]);
	expect(gl.generateMipmap).not.toHaveBeenCalled();
	const mip = imageTexture(gl, { width: 30, height: 12 }, true);
	expect(mip.bytes).toBe(Math.ceil(32 * 16 * 4 * 4 / 3));
	expect(gl.generateMipmap).toHaveBeenCalledOnce();
});

it('deletes an allocated texture if uploading fails', () => {
	const gl = context();
	gl.texImage2D.mockImplementation(() => { throw new Error('upload failed'); });
	expect(() => imageTexture(gl, { width: 16, height: 16 }, false)).toThrow('upload failed');
	expect(gl.deleteTexture).toHaveBeenCalledExactlyOnceWith(gl.createTexture.mock.results[0].value);
});
