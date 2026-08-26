function containsChinese(value) {
	return typeof value === 'string' && /[\u3400-\u9fff]/.test(value);
}

export function mergeLocalizedMapInfo(official = {}, localized = {}) {
	const merged = { ...official };

	if (containsChinese(localized.displayName)) {
		merged.displayName = localized.displayName;
	}

	const localizedSignName = {};
	for (const key of ['mainTitle', 'subTitle']) {
		if (containsChinese(localized.signName?.[key])) {
			localizedSignName[key] = localized.signName[key];
		}
	}
	if (Object.keys(localizedSignName).length > 0) {
		merged.signName = { ...official.signName, ...localizedSignName };
	}

	return merged;
}
