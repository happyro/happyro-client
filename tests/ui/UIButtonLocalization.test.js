import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('DB/DBManager.js', () => ({ default: { INTERFACE_PATH: 'interface/' } }));
vi.mock('Core/Client.js', () => ({ default: { loadFile: vi.fn() } }));

import Client from 'Core/Client.js';
import '../../src/UI/Elements/UIButton.js';

describe('ui-button localization', () => {
	beforeEach(() => {
		document.body.textContent = '';
		Client.loadFile.mockClear();
	});

	it('replaces Korean text assets with a Chinese control', () => {
		const button = document.createElement('ui-button');
		button.setAttribute('bg', 'btn_edit.bmp');
		button.setAttribute('hover', 'btn_edit_a.bmp');
		button.setAttribute('down', 'btn_edit_b.bmp');
		document.body.appendChild(button);

		expect(button.textContent).toBe('编辑');
		expect(button.classList.contains('localized-control')).toBe(true);
		expect(button.getAttribute('aria-label')).toBe('编辑');
		expect(button.hasAttribute('bg')).toBe(false);
		expect(Client.loadFile).not.toHaveBeenCalled();
	});

	it('uses a context-specific label for a shared asset', () => {
		const button = document.createElement('ui-button');
		button.dataset.localizedLabel = '返回';
		button.setAttribute('bg', 'make_character_ver2/bt_make_normal.bmp');
		document.body.appendChild(button);

		expect(button.textContent).toBe('返回');
		expect(Client.loadFile).not.toHaveBeenCalled();
	});
});
