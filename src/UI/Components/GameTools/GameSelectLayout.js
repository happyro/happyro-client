const edge = 8;
const maxHeight = 360;
const preferredBelow = 180;
const minHeight = 30;

/** Top-layer choices use the visible screen, not the height of a small dialog. */
function menuOverlayBounds() {
	const visual = window.visualViewport;
	const viewport = { left: visual?.offsetLeft || 0, top: visual?.offsetTop || 0 };
	viewport.right = viewport.left + (visual?.width || window.innerWidth);
	viewport.bottom = viewport.top + (visual?.height || window.innerHeight);
	return viewport;
}

/** Place mobile selects in the top layer so scroll containers cannot clip choices. */
export function openGameSelectOverlay(root, close) {
	const menu = root.querySelector('.game-select-menu');
	const trigger = root.querySelector('.game-select-trigger');
	const fitOptions = Boolean(root.closest('.shortcut-fields'));
	root.classList.remove('drop-up');
	menu.setAttribute('popover', 'manual');
	// Reset the previous opening's coordinates before entering the top layer.
	Object.assign(menu.style, {
		position: 'fixed',
		inset: 'auto',
		left: '0px',
		top: '0px',
		margin: '0',
		boxSizing: 'border-box',
		visibility: 'hidden'
	});
	function position() {
		const bounds = menuOverlayBounds();
		const rect = trigger.getBoundingClientRect();
		const below = bounds.bottom - rect.bottom - edge - 2;
		const above = rect.top - bounds.top - edge - 2;
		const up = below < preferredBelow && above > below;
		const height = Math.min(maxHeight, up ? above : below);
		const width = bounds.right - bounds.left - edge * 2;
		if (height < minHeight || width <= 0) return false;
		Object.assign(menu.style, {
			width: fitOptions ? 'max-content' : `${Math.min(rect.width, width)}px`,
			minWidth: fitOptions ? `${Math.min(rect.width, width)}px` : '0',
			maxWidth: `${width}px`,
			maxHeight: `${height}px`
		});
		const size = menu.getBoundingClientRect();
		Object.assign(menu.style, {
			left: `${Math.max(bounds.left + edge, Math.min(rect.left, bounds.right - edge - size.width))}px`,
			top: `${up ? rect.top - size.height - 2 : rect.bottom + 2}px`
		});
		return true;
	}
	menu.showPopover();
	if (!position()) {
		menu.hidePopover();
		menu.style.removeProperty('visibility');
		close();
		return () => {};
	}
	menu.style.removeProperty('visibility');
	// Re-measure after top-layer layout, and whenever wrapping/filtering changes its size.
	const updatePosition = () => {
		if (!position()) close();
	};
	const frame = requestAnimationFrame(updatePosition);
	const resize = new ResizeObserver(updatePosition);
	resize.observe(menu);
	resize.observe(trigger);
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
		cancelAnimationFrame(frame);
		resize.disconnect();
		abort.abort();
		observer.disconnect();
		menu.hidePopover();
	};
}
