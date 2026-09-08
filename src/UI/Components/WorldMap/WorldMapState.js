/**
 * Apply persistent interaction state after a world-map view is rebuilt.
 *
 * @param {ShadowRoot|HTMLElement} root
 * @param {Object} state
 */
export function applyWorldMapState(root, state) {
	const worldMap = root.querySelector('.worldmap');
	if (!worldMap) return;

	worldMap.classList.toggle('show-lvls', state.showLevels);
	for (const section of worldMap.querySelectorAll('.section')) {
		section.classList.toggle('allmapvisible', state.showAllMaps);
		section.classList.toggle('membersonmap', state.partyMapIds.has(section.id));
	}

	const toggleMaps = root.querySelector('.togglemaps');
	if (toggleMaps) toggleMaps.setAttribute('aria-pressed', String(state.showAllMaps));
	const showLevels = root.querySelector('.showlvl');
	if (showLevels) showLevels.setAttribute('aria-pressed', String(state.showLevels));
}
