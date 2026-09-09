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

export function loadNavigationCatalog() {
	return loadNavigationResource('catalog', ['maps', 'monsters', 'npcs']);
}

export function loadNavigationGraph() {
	return loadNavigationResource('graph', ['links', 'linkDistances', 'npcDistances']);
}

export function resetNavigationResources() {
	resources.clear();
}
