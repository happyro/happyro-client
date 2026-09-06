import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const worldMapSource = readFileSync(
	resolve(process.cwd(), 'src/UI/Components/WorldMap/WorldMap.js'),
	'utf8'
);
const navigationSource = readFileSync(
	resolve(process.cwd(), 'src/UI/Components/Navigation/Navigation.js'),
	'utf8'
);

describe('world map navigation', () => {
	it('opens the selected map by id instead of searching its display name', () => {
		const clickHandler = worldMapSource.match(
			/function onWorldMapSectionClick\(e\) \{[\s\S]*?\n\}/
		)?.[0];

		expect(clickHandler).toContain('Navigation.showMap(mapId, displayName)');
		expect(clickHandler).not.toContain('Navigation.onSearch()');
	});

	it('loads the selected map and rejects stale resource callbacks', () => {
		expect(navigationSource).toMatch(
			/Navigation\.showMap = function showMap\(mapName, displayName, options = \{\}\) \{[\s\S]*this\.loadMap\(mapName, displayName\);/
		);
		expect(navigationSource).toContain('const requestId = ++_mapLoadRequestId;');
		expect(navigationSource.match(/if \(requestId !== _mapLoadRequestId\) return;/g)).toHaveLength(2);
	});

	it('preserves the query when a map is opened from a monster result', () => {
		const resultHandler = navigationSource.match(
			/Navigation\.navigateToSearchResult = function navigateToSearchResult\(result\) \{[\s\S]*?\n\};/
		)?.[0];

		expect(resultHandler).toContain('preserveSearch: true');
		expect(navigationSource).toContain('if (searchInput && !options.preserveSearch)');
	});

	it('keeps coordinate clicks on a preview map local to that preview', () => {
		expect(navigationSource).toContain('if (previewMap !== currentMap)');
		expect(navigationSource).toContain('_targetData = { x: mapCoords.x, y: mapCoords.y, map: previewMap }');
	});
});
