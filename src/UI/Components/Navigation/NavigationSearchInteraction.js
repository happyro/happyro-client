const SEARCH_INTERACTION_SELECTOR = '.search-results, .search-input, .search-button, .search-type';

/**
 * Check whether an event originated inside the navigation search controls.
 * composedPath() is required because the controls live in a Shadow DOM.
 *
 * @param {Event} event
 * @returns {boolean}
 */
export function isNavigationSearchInteraction(event) {
	const path = typeof event?.composedPath === 'function' ? event.composedPath() : [event?.target];
	return path.some(node => node?.nodeType === Node.ELEMENT_NODE && node.closest(SEARCH_INTERACTION_SELECTOR));
}
