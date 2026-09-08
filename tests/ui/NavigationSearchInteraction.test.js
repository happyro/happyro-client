import { describe, expect, it } from 'vitest';
import { isNavigationSearchInteraction } from '../../src/UI/Components/Navigation/NavigationSearchInteraction.js';

describe('navigation search interaction detection', () => {
	it('recognizes controls inside a shadow-root composed path', () => {
		const host = document.createElement('div');
		const shadow = host.attachShadow({ mode: 'open' });
		const button = document.createElement('button');
		button.className = 'search-button';
		shadow.appendChild(button);

		const event = new Event('click', { composed: true });
		Object.defineProperty(event, 'composedPath', { value: () => [button, shadow, host, document] });

		expect(isNavigationSearchInteraction(event)).toBe(true);
	});

	it('recognizes clicks outside the search controls', () => {
		const outside = document.createElement('div');
		const event = new Event('click');
		Object.defineProperty(event, 'composedPath', { value: () => [outside, document] });

		expect(isNavigationSearchInteraction(event)).toBe(false);
	});

	it('keeps the search action isolated from document-level dismissal', () => {
		const event = new Event('click', { bubbles: true });
		expect(event.cancelBubble).toBe(false);
		event.stopPropagation();
		expect(event.cancelBubble).toBe(true);
	});
});
