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
			/Navigation\.showMap = function showMap\(mapName, displayName\) \{[\s\S]*this\.loadMap\(mapName, displayName\);/
		);
		expect(navigationSource).toContain('const requestId = ++_mapLoadRequestId;');
		expect(navigationSource.match(/if \(requestId !== _mapLoadRequestId\) return;/g)).toHaveLength(2);
	});
});
