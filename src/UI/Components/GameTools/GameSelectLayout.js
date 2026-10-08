const edge = 8;
const maxHeight = 240;
const minHeight = 30;

/** Dropdowns stay inside their owning menu and the visible viewport. */
function menuOverlayBounds(element) {
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

/** Place mobile selects in the top layer so scroll containers cannot clip choices. */
export function openGameSelectOverlay(root, close) {
	const menu = root.querySelector('.game-select-menu');
	const trigger = root.querySelector('.game-select-trigger');
	const bounds = menuOverlayBounds(root);
	const rect = trigger.getBoundingClientRect();
	const below = bounds.bottom - rect.bottom - edge - 2;
	const above = rect.top - bounds.top - edge - 2;
	const up = below < maxHeight && above > below;
	const height = Math.min(maxHeight, up ? above : below);
	const width = bounds.right - bounds.left - edge * 2;
	if (height < minHeight || width <= 0) {
		close();
		return () => {};
	}
	root.classList.remove('drop-up');
	menu.setAttribute('popover', 'manual');
	const fitOptions = Boolean(root.closest('.shortcut-fields'));
	Object.assign(menu.style, {
		position: 'fixed',
		inset: 'auto',
		margin: '0',
		boxSizing: 'border-box',
		width: fitOptions ? 'max-content' : `${Math.min(rect.width, width)}px`,
		minWidth: fitOptions ? `${Math.min(rect.width, width)}px` : '0',
		maxWidth: `${width}px`,
		maxHeight: `${height}px`
	});
	menu.showPopover();
	const size = menu.getBoundingClientRect();
	Object.assign(menu.style, {
		left: `${Math.max(bounds.left + edge, Math.min(rect.left, bounds.right - edge - size.width))}px`,
		top: `${up ? rect.top - size.height - 2 : rect.bottom + 2}px`
	});
	const abort = new AbortController();
	const options = { signal: abort.signal };
	window.addEventListener('resize', close, options);
	for (const type of ['resize', 'scroll']) window.visualViewport?.addEventListener(type, close, options);
	const tree = root.getRootNode();
	tree.addEventListener(
		'scroll',
		event => {
			if (!menu.contains(event.target)) close();
		},
		{ ...options, capture: true }
	);
	document.addEventListener(
		'pointerdown',
		event => {
			if (!event.composedPath().includes(root)) close();
		},
		options
	);
	const observer = new MutationObserver(() => {
		if (!root.isConnected) close();
	});
	observer.observe(tree, { childList: true, subtree: true });
	if (tree !== document) observer.observe(document.body, { childList: true, subtree: true });
	return () => {
		abort.abort();
		observer.disconnect();
		menu.hidePopover();
	};
}
