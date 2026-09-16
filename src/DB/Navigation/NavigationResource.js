const resources = new Map();

function loadNavigationResource(name, requiredKeys) {
	if (!resources.has(name)) {
		const request = fetch(new URL(`./data/navigation/${name}.json`, window.location.href))
			.then(response => {
				if (!response.ok) throw new Error(`Navigation ${name} request failed: ${response.status}`);
				return response.json();
			})
			.then(data => {
				if (data.schemaVersion !== 1 || requiredKeys.some(key => !Array.isArray(data[key]))) {
					throw new Error(`Navigation ${name} data is invalid`);
				}
				return data;
			})
			.catch(error => {
				resources.delete(name);
				throw error;
			});
		resources.set(name, request);
	}
	return resources.get(name);
}

function loadNavigationObject(name, requiredKey) {
	if (!resources.has(name)) {
		const request = fetch(new URL(`./data/navigation/${name}.json`, window.location.href))
			.then(response => {
				if (!response.ok) throw new Error(`Navigation ${name} request failed: ${response.status}`);
				return response.json();
			})
			.then(data => {
				if (!data || typeof data[requiredKey] !== 'object' || data[requiredKey] === null) {
					throw new Error(`Navigation ${name} data is invalid`);
				}
				return data;
			})
			.catch(error => {
				resources.delete(name);
				throw error;
			});
		resources.set(name, request);
	}
	return resources.get(name);
}

export function loadNavigationCatalog() {
	return loadNavigationResource('catalog', ['maps', 'monsters', 'npcs']);
}

export function loadNavigationGraph() {
	return loadNavigationResource('graph', ['links', 'linkDistances', 'npcDistances']);
}

/**
 * Localized NPC instance names, ~780 KB. Fetched instead of bundled so the
 * table only costs anything once navigation search is actually used.
 */
export function loadNpcInstanceNames() {
	return loadNavigationObject('npc-instances', 'instances');
}

/** Shared map catalog used to list every supported map. */
export function loadMapCatalog() {
	return loadNavigationObject('map-catalog', 'entries');
}

export function resetNavigationResources() {
	resources.clear();
}
