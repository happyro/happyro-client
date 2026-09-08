import { matchesCatalogSearch } from './CatalogData.js';

const commonMapOrder = [
	'prontera',
	'prt_fild08',
	'izlude',
	'geffen',
	'payon',
	'morocc',
	'alberta',
	'aldebaran',
	'yuno',
	'lighthalzen',
	'einbroch',
	'hugel',
	'rachel',
	'veins',
	'comodo',
	'umbala',
	'amatsu',
	'gonryun',
	'louyang',
	'ayothaya',
	'moc_para01'
];
const commonMapRanks = new Map(commonMapOrder.map((map, index) => [map, index]));

export function mapCatalogRank(map, currentMap = '') {
	const id = String(map.id || '').toLocaleLowerCase();
	const name = String(map.name || '').toLocaleLowerCase();
	if (id === currentMap) return [0, 0];
	if (commonMapRanks.has(id)) return [1, commonMapRanks.get(id)];
	if (/^(?:pvp_|guild_vs|bat_|schg_|teg_|gvg_)/.test(id) || /\bpvp\b|对战|竞技场/.test(name)) return [5, 0];
	if (/^(?:[12]@|e_|dali|ver_eju|glast_01)/.test(id)) return [4, 0];
	if (/(?:_in\d*|_dun\d*|dun\d*|_q\d*|_room|_boss)$/.test(id)) return [3, 0];
	return [2, 0];
}

export function filterAndSortMaps(maps, search, scope, currentMap = '') {
	const term = String(search || '')
		.trim()
		.toLocaleLowerCase();
	const matchRank = map => {
		const values = [map.name, map.id].map(value => String(value).toLocaleLowerCase());
		if (!term) return 0;
		if (values.some(value => value === term)) return 0;
		if (values.some(value => value.startsWith(term))) return 1;
		return 2;
	};
	return maps
		.filter(
			map =>
				(scope !== 'current' || map.mapName === currentMap) && matchesCatalogSearch([map.name, map.id], search)
		)
		.sort((left, right) => {
			const searchDifference = matchRank(left) - matchRank(right);
			if (searchDifference) return searchDifference;
			const imageDifference = Number(Boolean(right.hasImage)) - Number(Boolean(left.hasImage));
			if (imageDifference) return imageDifference;
			const leftRank = mapCatalogRank(left, currentMap);
			const rightRank = mapCatalogRank(right, currentMap);
			return leftRank[0] - rightRank[0] || leftRank[1] - rightRank[1] || left.name.localeCompare(right.name);
		});
}
