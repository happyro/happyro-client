import { mountGameSelects } from './GameSelect.js';

export function mountRemoteCatalogBrowser(container, options) {
	const state = { items: [], selected: null, page: 1, total: 0, loading: false, error: '' };
	let requestToken = 0;
	let searchTimer;
	container.innerHTML = `
		<div class="catalog-toolbar">
			<input class="catalog-search" type="search" placeholder="${options.placeholder}" aria-label="${options.searchLabel}">
			${options.filterHtml || ''}
			${options.toolbarActionHtml || ''}
		</div>
		<div class="catalog-layout">
			<section class="catalog-browser">
				<div class="catalog-summary">正在加载资料...</div><div class="catalog-list"></div>
				<div class="catalog-pagination"><button class="catalog-prev" type="button" aria-label="上一页">&#9664;</button><span class="catalog-page"></span><button class="catalog-next" type="button" aria-label="下一页">&#9654;</button></div>
			</section>
			<section class="catalog-detail"><div class="empty-detail">${options.emptyDetail}</div></section>
		</div>`;

	const search = container.querySelector('.catalog-search');
	const filters = [...container.querySelectorAll('.catalog-filter.game-select-value')];
	const list = container.querySelector('.catalog-list');
	const detail = container.querySelector('.catalog-detail');
	mountGameSelects(container);
	const api = {
		get state() {
			return state;
		},
		refreshDetail: renderDetail,
		reload: loadPage
	};

	function renderDetail() {
		if (!state.selected) detail.innerHTML = `<div class="empty-detail">${options.emptyDetail}</div>`;
		else options.renderDetail(detail, state.selected, api);
	}

	function renderList() {
		const pageCount = Math.max(1, Math.ceil(state.total / options.pageSize));
		container.querySelector('.catalog-summary').textContent = state.loading
			? '正在加载资料...'
			: state.error || `共 ${state.total} 条资料`;
		container.querySelector('.catalog-page').textContent = `${state.page} / ${pageCount}`;
		container.querySelector('.catalog-prev').disabled = state.loading || state.page <= 1;
		container.querySelector('.catalog-next').disabled = state.loading || state.page >= pageCount;
		list.innerHTML = state.items.map(item => options.renderRow(item, state.selected)).join('');
		list.querySelectorAll('[data-catalog-key]').forEach(button =>
			button.addEventListener('click', () => {
				state.selected =
					state.items.find(item => String(options.key(item)) === button.dataset.catalogKey) || null;
				renderList();
				renderDetail();
			})
		);
		options.onListRendered?.(list, state.items);
	}

	async function loadPage() {
		const token = ++requestToken;
		state.loading = true;
		state.error = '';
		renderList();
		try {
			const result = await options.load({
				query: search.value.trim(),
				filter: filters[0]?.value || '',
				filters: Object.fromEntries(
					filters.filter(input => input.name).map(input => [input.name, input.value])
				),
				page: state.page,
				perPage: options.pageSize
			});
			if (token !== requestToken) return;
			state.items = result.items;
			state.total = result.total;
			if (state.selected) {
				state.selected =
					state.items.find(item => options.key(item) === options.key(state.selected)) || state.selected;
			} else {
				state.selected = state.items[0] || null;
			}
		} catch (error) {
			if (token !== requestToken) return;
			state.items = [];
			state.total = 0;
			state.error = error.message;
		} finally {
			if (token === requestToken) {
				state.loading = false;
				renderList();
				renderDetail();
			}
		}
	}

	function resetAndLoad() {
		state.page = 1;
		void loadPage();
	}
	search.addEventListener('input', () => {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(resetAndLoad, 250);
	});
	filters.forEach(input =>
		input.addEventListener('change', () => {
			options.onFiltersChange?.(
				Object.fromEntries(filters.filter(item => item.name).map(item => [item.name, item.value]))
			);
			resetAndLoad();
		})
	);
	const filterValues = () =>
		Object.fromEntries(filters.filter(item => item.name).map(item => [item.name, item.value]));
	options.onFiltersChange?.(filterValues());
	options.onReady?.({ container, reload: resetAndLoad, refreshDetail: renderDetail });
	container.querySelector('.catalog-prev').addEventListener('click', () => {
		state.page -= 1;
		void loadPage();
	});
	container.querySelector('.catalog-next').addEventListener('click', () => {
		state.page += 1;
		void loadPage();
	});
	void loadPage();

	return () => {
		requestToken += 1;
		clearTimeout(searchTimer);
		options.cleanup?.();
	};
}
