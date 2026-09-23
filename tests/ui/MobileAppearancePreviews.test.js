import { expect, it, vi } from 'vitest';
vi.mock('Core/Client.js', () => ({ default: { loadFile: vi.fn((path, callback) => callback('data:image/png;base64,test')) } }));
vi.mock('DB/DBManager.js', () => ({ default: { INTERFACE_PATH: 'interface/' } }));
import { loadAppearanceColors } from '../../src/UI/Mobile/auth/AppearancePreviews.js';
import Client from 'Core/Client.js';

it('samples desktop swatch colors once per screen without rendering characters', () => {
	const root = document.createElement('div');
	root.innerHTML = '<span class="color-swatch" data-color="0"></span><span class="color-swatch" data-color="8"></span>';
	const drawImage = vi.fn();
	const ctx = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage, getImageData: () => ({ data: [120, 70, 30, 255] }) });
	vi.stubGlobal('Image', class {
		naturalWidth = 20; naturalHeight = 20;
		set src(value) { this.onload(); }
	});
	try {
		loadAppearanceColors(root);
		loadAppearanceColors(root);
		expect(Client.loadFile.mock.calls.map(([path]) => path)).toEqual(['interface/make_character_ver2/color01_off.bmp', 'interface/make_character_ver2/color09_off.bmp']);
		expect(drawImage).toHaveBeenCalledTimes(2);
		expect(root.firstElementChild.style.backgroundColor).toBe('rgb(120, 70, 30)');
	} finally { ctx.mockRestore(); vi.unstubAllGlobals(); }
});
