export function snapshotLocalizedStatusDescriptions(statusInfo) {
	const descriptions = new Map();

	for (const [id, info] of Object.entries(statusInfo)) {
		if (Array.isArray(info.descript) && info.descript.length > 0) {
			descriptions.set(Number(id), info.descript.map(line => [...line]));
		}
	}

	return descriptions;
}

export function restoreLocalizedStatusDescription(statusInfo, descriptions, id) {
	const localized = descriptions.get(Number(id));
	statusInfo[id].descript = localized ? localized.map(line => [...line]) : [];
	return Boolean(localized);
}
