import MAPS from 'DB/Map/WorldMap.js';
import Configs from 'Core/Configs.js';
import Client from 'Core/Client.js';
import DB from 'DB/DBManager.js';
import MapRenderer from 'Renderer/MapRenderer.js';

export function createGameMaps() {
	const config = Configs.get('worldMapSettings', { episode: 98, add: [], remove: [] });
	const episode = config.episode ?? 98;
	const regions = MAPS.filter(region => episode >= region.ep_from && episode < region.ep_to).map(region => ({
		...region,
		maps: region.maps.filter(
			map =>
				((episode >= map.ep_from && episode < map.ep_to) || config.add?.includes(map.id)) &&
				!config.remove?.includes(map.id)
		)
	}));
	return {
		regions,
		current: () => MapRenderer.currentMap.replace(/\.gat$/i, ''),
		loadRegion: (id, done) => Client.loadFile(DB.INTERFACE_PATH + id, done),
		loadMap: (id, done) => Client.loadFile(`${DB.INTERFACE_PATH}map/${id}.bmp`, done),
		mapName: id => DB.getMapName(`${id}.gat`, id)
	};
}
