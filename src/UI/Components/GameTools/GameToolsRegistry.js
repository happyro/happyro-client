const tabs = new Map();

export function registerGameToolsTab(tab) {
	if (!tab?.id || !tab?.label || typeof tab.mount !== 'function') {
		throw new TypeError('A game tools tab requires id, label and mount.');
	}
	if (tabs.has(tab.id)) {
		throw new Error(`Game tools tab already registered: ${tab.id}`);
	}
	tabs.set(tab.id, Object.freeze({ ...tab }));
}

export function getGameToolsTabs() {
	return [...tabs.values()];
}
