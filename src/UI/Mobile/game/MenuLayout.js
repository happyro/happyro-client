/** Classify available layout space, never the device name or the keyboard height. */
export const MENU_BREAKPOINT = { width: 768, height: 560 };
export function updateMenuLayout(host, width, height) {
	host.dataset.menuDensity =
		width >= MENU_BREAKPOINT.width && height >= MENU_BREAKPOINT.height ? 'spacious' : 'compact';
}
