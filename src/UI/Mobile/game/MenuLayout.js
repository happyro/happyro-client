/** Classify available layout space, never the device name or the keyboard height. */
export const MENU_BREAKPOINT = { width: 768, height: 560 };
export function updateMenuLayout(host, width, height) {
	host.dataset.menuDensity =
		width >= MENU_BREAKPOINT.width && height >= MENU_BREAKPOINT.height ? 'spacious' : 'compact';
}

export const MENU_SELECT = { edge: 8, maxHeight: 240, minHeight: 30 };
/** Dropdowns stay inside their owning menu and the visible viewport. */
export function menuOverlayBounds(element) {
	const visual = window.visualViewport;
	const viewport = { left: visual?.offsetLeft || 0, top: visual?.offsetTop || 0 };
	viewport.right = viewport.left + (visual?.width || window.innerWidth);
	viewport.bottom = viewport.top + (visual?.height || window.innerHeight);
	const owner = element.closest('dialog, .mobile-menu-window');
	const rect = owner?.getBoundingClientRect();
	if (!rect?.width || !rect.height) return viewport;
	return {
		left: Math.max(viewport.left, rect.left),
		top: Math.max(viewport.top, rect.top),
		right: Math.min(viewport.right, rect.right),
		bottom: Math.min(viewport.bottom, rect.bottom)
	};
}
