import { mountGameSelect, renderGameSelect, setGameSelectOptions } from 'UI/Components/GameTools/GameSelect.js';

/** Keep form values and existing change handlers while sharing the catalog dropdown UI. */
export function createMenuSelects(container) {
	const entries = new Map();
	const abort = new AbortController();
	function sync() {
		for (const [select, entry] of entries) {
			if (!container.contains(select)) {
				entry.root.remove();
				entries.delete(select);
			}
		}
		for (const select of container.querySelectorAll('select')) {
			let entry = entries.get(select);
			const options = [...select.options].map(option => ({
				value: option.value,
				label: option.textContent,
				disabled: option.disabled || option.parentElement.disabled
			}));
			const ariaLabel =
				select.getAttribute('aria-label') ||
				entry?.ariaLabel ||
				select.labels?.[0]?.childNodes[0]?.textContent.trim() ||
				'选择';
			const state = { options, value: select.value, disabled: select.disabled, ariaLabel };
			const key = JSON.stringify(state);
			if (!entry) {
				const holder = document.createElement('div');
				holder.innerHTML = renderGameSelect(state);
				const root = holder.firstElementChild;
				root.classList.add('menu-select');
				select.after(root);
				select.hidden = true;
				const control = mountGameSelect(root);
				entry = { root, control, ariaLabel, key: '' };
				entries.set(select, entry);
				control.input.addEventListener('change', event => {
					event.stopPropagation();
					select.value = control.input.value;
					select.dispatchEvent(new Event('input', { bubbles: true }));
					select.dispatchEvent(new Event('change', { bubbles: true }));
					sync();
				});
				const trigger = root.querySelector('.game-select-trigger');
				const menu = root.querySelector('.game-select-menu');
				function positionMenu() {
					if (menu.hidden) return;
					const rect = trigger.getBoundingClientRect();
					const viewport = window.visualViewport;
					const top = viewport?.offsetTop || 0;
					const bottom = top + (viewport?.height || innerHeight);
					const below = bottom - rect.bottom - 8;
					const above = rect.top - top - 8;
					const up = below < 160 && above > below;
					const height = Math.max(30, Math.min(240, up ? above : below));
					const fitOptions = Boolean(root.closest('.shortcut-fields'));
					const left = (viewport?.offsetLeft || 0) + 8;
					const availableWidth = (viewport?.width || innerWidth) - 16;
					if (fitOptions) {
						menu.style.width = 'max-content';
						menu.style.minWidth = `${Math.min(rect.width, availableWidth)}px`;
						menu.style.maxWidth = `${availableWidth}px`;
					}
					const width = fitOptions ? menu.getBoundingClientRect().width : rect.width;
					root.classList.remove('drop-up');
					Object.assign(menu.style, {
						left: `${fitOptions ? Math.max(left, Math.min(rect.left, left + availableWidth - width)) : rect.left}px`,
						width: `${width}px`,
						maxHeight: `${height}px`,
						top: up ? `${rect.top - Math.min(height, menu.scrollHeight + 2) - 2}px` : `${rect.bottom + 2}px`
					});
				}
				trigger.addEventListener('click', positionMenu);
				root.addEventListener('keydown', positionMenu);
			}
			if (entry.key !== key) {
				setGameSelectOptions(entry.root, state);
				entry.key = key;
			}
		}
	}
	container.addEventListener(
		'change',
		event => {
			if (event.target.matches('select')) sync();
		},
		{ signal: abort.signal }
	);
	const observer = new MutationObserver(sync);
	observer.observe(container, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['disabled', 'selected', 'label'],
		characterData: true
	});
	function close() {
		for (const entry of entries.values()) entry.control.close();
	}
	container.addEventListener(
		'scroll',
		event => {
			if (!event.target.closest?.('.game-select-menu')) close();
		},
		{ capture: true, signal: abort.signal }
	);
	container.addEventListener(
		'pointerdown',
		event => {
			if (!event.target.closest('.game-select')) close();
		},
		{ signal: abort.signal }
	);
	window.addEventListener('resize', close, { signal: abort.signal });
	sync();
	return {
		sync,
		close,
		destroy() {
			observer.disconnect();
			abort.abort();
			entries.clear();
		}
	};
}
