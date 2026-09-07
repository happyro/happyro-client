const navigationNpcTerms = [
	['카프라', '卡普拉'],
	['직원', '职员'],
	['서비스', '服务'],
	['워프', '传送员']
];

const navigationNpcPhrases = [
	['이동 서비스 직원', '传送服务职员'],
	['이동 서비스', '传送服务'],
	['미스티', '米斯蒂']
];

/**
 * Localize common Korean names that only exist in navigation resources.
 *
 * @param {string} name
 * @returns {string}
 */
export function localizeNavigationNpcName(name) {
	if (!name.includes('카프라')) return name;

	let localized = name;
	for (const [source, target] of navigationNpcPhrases) {
		localized = localized.replaceAll(source, target);
	}
	for (const [source, target] of navigationNpcTerms) {
		localized = localized.replaceAll(source, target);
	}
	return localized;
}

/**
 * Return familiar search aliases for Korean navigation-only names.
 *
 * @param {string} name
 * @returns {Array<string>}
 */
export function getNavigationNpcAliases(name) {
	return name.includes('카프라') ? ['Kafra'] : [];
}
