import { describe, expect, it } from 'vitest';
import { requestGameToolsConfirmation } from '../../src/UI/Components/GameTools/GameToolsConfirm.js';

describe('game tools confirmation', () => {
	it('covers the complete game tools window', async () => {
		document.body.innerHTML = '<div class="game-tools-window"><div class="game-tools-tab"></div></div>';
		const window = document.querySelector('.game-tools-window');
		const tab = document.querySelector('.game-tools-tab');
		const confirmation = requestGameToolsConfirmation(tab, '确认发放？');

		expect(window.querySelector(':scope > .game-tools-confirm')).not.toBeNull();
		expect(tab.querySelector('.game-tools-confirm')).toBeNull();
		window.querySelector('[data-cancel]').click();

		await expect(confirmation).resolves.toBe(false);
	});
});
