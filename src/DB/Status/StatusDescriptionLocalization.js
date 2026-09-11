import officialStateIconTranslations from './stateiconinfo.zh-CN.json';

export function applyOfficialStateIconTranslations(statusInfo, overlay = officialStateIconTranslations) {
	for (const [id, entry] of Object.entries(overlay)) {
		const statusId = Number(id);
		if (!statusInfo[statusId]) statusInfo[statusId] = {};
		if (Object.hasOwn(entry, 'haveTimeLimit')) statusInfo[statusId].haveTimeLimit = entry.haveTimeLimit;
		if (Object.hasOwn(entry, 'posTimeLimitStr')) statusInfo[statusId].posTimeLimitStr = entry.posTimeLimitStr;
		statusInfo[statusId].descript = entry.descript.map(line => [...line]);
	}
	return statusInfo;
}

export function snapshotLocalizedStatusDescriptions(statusInfo, overlay = officialStateIconTranslations) {
	applyOfficialStateIconTranslations(statusInfo, overlay);
	const descriptions = new Map();

	for (const [id, info] of Object.entries(statusInfo)) {
		if (Array.isArray(info.descript) && info.descript.length > 0) {
			descriptions.set(
				Number(id),
				info.descript.map(line => [...line])
			);
		}
	}

	return descriptions;
}

export function restoreLocalizedStatusDescription(statusInfo, descriptions, id) {
	const localized = descriptions.get(Number(id));
	statusInfo[id].descript = localized ? localized.map(line => [...line]) : [];
	return Boolean(localized);
}
