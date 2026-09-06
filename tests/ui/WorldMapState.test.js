import { describe, expect, it } from 'vitest';
import { applyWorldMapState } from '../../src/UI/Components/WorldMap/WorldMapState.js';

function createRoot() {
	const root = document.createElement('div');
	root.innerHTML = `
		<button class="togglemaps"></button>
		<button class="showlvl"></button>
		<div class="worldmap">
			<div id="prontera" class="section"></div>
			<div id="geffen" class="section"></div>
		</div>
	`;
	return root;
}

describe('world map persistent state', () => {
	it('restores map visibility, level mode and party highlights after a rebuild', () => {
		const root = createRoot();
		applyWorldMapState(root, {
			showAllMaps: true,
			showLevels: true,
			partyMapIds: new Set(['geffen'])
		});

		expect(root.querySelector('.worldmap').classList.contains('show-lvls')).toBe(true);
		expect(root.querySelectorAll('.allmapvisible')).toHaveLength(2);
		expect(root.querySelector('#geffen').classList.contains('membersonmap')).toBe(true);
		expect(root.querySelector('#prontera').classList.contains('membersonmap')).toBe(false);
		expect(root.querySelector('.togglemaps').getAttribute('aria-pressed')).toBe('true');
		expect(root.querySelector('.showlvl').getAttribute('aria-pressed')).toBe('true');
	});

	it('removes persistent classes when modes are disabled', () => {
		const root = createRoot();
		for (const section of root.querySelectorAll('.section')) {
			section.classList.add('allmapvisible', 'membersonmap');
		}

		applyWorldMapState(root, {
			showAllMaps: false,
			showLevels: false,
			partyMapIds: new Set()
		});

		expect(root.querySelectorAll('.allmapvisible, .membersonmap')).toHaveLength(0);
	});
});
