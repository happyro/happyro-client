import { describe, expect, it } from 'vitest';
import { showQuestList } from '../../src/UI/Components/Quest/QuestTabVisibility.js';

describe('quest tab visibility', () => {
	it('shows only the selected quest list', () => {
		document.body.innerHTML = `
			<div id="quest-root">
				<ul id="active-quest-list" class="quest-list"></ul>
				<ul id="feature-quest-list" class="quest-list"></ul>
				<ul id="inactive-quest-list" class="quest-list"></ul>
				<ul id="cooldown-quest-list" class="quest-list"></ul>
			</div>`;
		const root = document.querySelector('#quest-root');

		showQuestList(root, '#active-quest-list');
		expect(root.querySelector('#active-quest-list').style.display).toBe('block');
		expect(root.querySelector('#feature-quest-list').style.display).toBe('none');

		showQuestList(root, '#inactive-quest-list');
		expect(root.querySelector('#active-quest-list').style.display).toBe('none');
		expect(root.querySelector('#inactive-quest-list').style.display).toBe('block');
	});
});
