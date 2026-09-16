const states = new WeakMap();
const scrollKey = node => `${node.tagName}.${node.className}`;
const fields = 'input[type="number"], form .game-select-value';

function fieldKey(input) {
	return `${input.closest('form')?.dataset.form || ''}:${input.name || input.className}`;
}

function setFieldValue(input, value) {
	input.value = value;
	const select = input.closest('[data-game-select]');
	if (!select) return;
	const option = [...select.querySelectorAll('[data-value]')].find(node => node.dataset.value === value);
	if (!option) return;
	select.querySelector('.game-select-trigger span').textContent = option.querySelector('strong').textContent;
	for (const node of select.querySelectorAll('[data-value]')) {
		node.classList.toggle('selected', node === option);
		node.setAttribute('aria-selected', String(node === option));
	}
}

export function trackTabView(container) {
	const drafts = new Map();
	const baselines = new WeakMap();
	const scrolls = new Map();
	let restoring = false;
	const capture = event => {
		const input = event.target;
		if (!input.matches(fields)) return;
		const key = fieldKey(input);
		if (input.value === baselines.get(input)) drafts.delete(key);
		else drafts.set(key, input.value);
	};
	const onScroll = event => {
		if (!restoring && event.target instanceof HTMLElement && !container.hidden) {
			scrolls.set(scrollKey(event.target), [event.target.scrollLeft, event.target.scrollTop]);
		}
	};
	const restore = () => {
		restoring = true;
		for (const input of container.querySelectorAll(fields)) {
			if (!baselines.has(input)) baselines.set(input, input.value);
			if (drafts.has(fieldKey(input))) {
				const value = drafts.get(fieldKey(input));
				if (input.value !== value) setFieldValue(input, value);
			}
		}
		if (!container.hidden) {
			for (const node of [container, ...container.querySelectorAll('[class]')]) {
				const scroll = scrolls.get(scrollKey(node));
				if (scroll) {
					node.scrollLeft = scroll[0];
					node.scrollTop = scroll[1];
				}
			}
		}
		restoring = false;
	};
	const observer = new MutationObserver(restore);
	observer.observe(container, { childList: true, subtree: true });
	container.addEventListener('input', capture);
	container.addEventListener('change', capture);
	container.addEventListener('scroll', onScroll, true);
	const state = {
		drafts,
		scrolls,
		restore,
		discardDrafts() {
			drafts.clear();
			for (const input of container.querySelectorAll(fields)) {
				setFieldValue(input, baselines.get(input) ?? input.defaultValue);
				input.setCustomValidity('');
			}
		},
		destroy() {
			observer.disconnect();
			container.removeEventListener('input', capture);
			container.removeEventListener('change', capture);
			container.removeEventListener('scroll', onScroll, true);
			states.delete(container);
		}
	};
	states.set(container, state);
	return state;
}

export function clearTabDrafts(container, names) {
	const drafts = states.get(container)?.drafts;
	if (!drafts) return;
	for (const key of drafts.keys()) {
		if (!names || names.includes(key.slice(key.indexOf(':') + 1))) drafts.delete(key);
	}
}

// Clear the remembered position as well as the DOM position before replacing content.
export function resetTabScroll(container, region) {
	if (!region) return;
	const scrolls = states.get(container)?.scrolls;
	for (const node of [region, ...region.querySelectorAll('[class]')]) {
		scrolls?.delete(scrollKey(node));
		node.scrollLeft = 0;
		node.scrollTop = 0;
	}
}
