import { describe, expect, it } from 'vitest';
import { applyMonsterSummaries } from '../../src/UI/Components/WorldMap/WorldMapMonsterSummary.js';

describe('world map monster summaries', () => {
	it('binds representative monsters to regular maps and every dungeon node', () => {
		const mapView = document.createElement('div');
		mapView.innerHTML = `
			<div class="section" data-mapid="field"><span class="mapname"></span></div>
			<div class="section is-dungeon-label" data-mapid="dungeon"><span class="mapname"></span></div>
			<div class="section is-dungeon-marker" data-mapid="dungeon"><span class="mapname"></span></div>
		`;
		const summaries = new Map([
			['field', { name: '波利' }],
			['dungeon', { name: '邪恶箱' }]
		]);

		applyMonsterSummaries(mapView, summaries);

		expect(mapView.querySelector('[data-mapid="field"]').dataset.monstername).toBe('波利');
		for (const section of mapView.querySelectorAll('[data-mapid="dungeon"]')) {
			expect(section.dataset.monstername).toBe('邪恶箱');
			expect(section.querySelector('.mapname').textContent).toBe('邪恶箱');
		}
	});
});
