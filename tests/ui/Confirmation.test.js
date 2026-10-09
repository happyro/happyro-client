import { describe, expect, it } from 'vitest';
import { requestConfirmation } from '../../src/UI/Components/Confirmation.js';

describe('game tools confirmation', () => {
	it('opens a native modal and resolves cancellation', async () => {
		document.body.innerHTML = '<div class="game-tools-window"><div class="game-tools-tab"></div></div>';
		const window = document.querySelector('.game-tools-window');
		const tab = document.querySelector('.game-tools-tab');
		const confirmation = requestConfirmation(tab, '确认发放？');

		expect(tab.querySelector('dialog.ui-confirm').open).toBe(true);
		window.querySelector('[data-cancel]').click();

		await expect(confirmation).resolves.toBe(false);
	});
});

it('cancels a replaced confirmation and a removed owner without accepting', async () => {
 const body = document.body.appendChild(document.createElement('div'));
 const first = requestConfirmation(body, 'first');
 const second = requestConfirmation(body, 'second');
 await expect(first).resolves.toBe(false);
 body.remove();
 await expect(second).resolves.toBe(false);
});
it('accepts once and cancels with Escape', async () => {
 const body = document.body.appendChild(document.createElement('div'));
 const accepted = requestConfirmation(body, 'accept');
 const button = body.querySelector('[data-confirm]'); button.click(); button.click();
 await expect(accepted).resolves.toBe(true);
 const cancelled = requestConfirmation(body, 'cancel');
 body.querySelector('dialog').dispatchEvent(new Event('cancel', {cancelable:true}));
 await expect(cancelled).resolves.toBe(false);
});

it('selects the original desktop card only for desktop adventure tools', async () => {
 const original = globalThis.ResizeObserver;
 globalThis.ResizeObserver = class { observe() {} disconnect() {} };
 try {
  const owner = document.createElement('section');
  owner.dataset.feedbackTheme = 'desktop';
  const container = owner.appendChild(document.createElement('div'));
  document.body.append(owner);
  const desktop = requestConfirmation(container, '确认发放？');
  expect(container.querySelector('dialog').style.getPropertyValue('--confirm-center-x')).toBe('0px');
  container.querySelector('[data-cancel]').click();
  await expect(desktop).resolves.toBe(false);
  delete owner.dataset.feedbackTheme;
  const mobile = requestConfirmation(container, '确认发放？');
  expect(container.querySelector('dialog').style.getPropertyValue('--confirm-center-x')).toBe('');
  container.querySelector('[data-cancel]').click();
  await expect(mobile).resolves.toBe(false);
 } finally { globalThis.ResizeObserver = original; }
});
