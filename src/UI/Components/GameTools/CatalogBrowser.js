import { paginateCatalog } from './CatalogData.js';
import { mountGameSelects } from './GameSelect.js';

export function mountCatalogBrowser(container, options) {
	const state = { items: [], filtered: [], selected: null, page: 1 };
	container.innerHTML = `
		<div class="catalog-toolbar">
			<input class="catalog-search" type="search" placeholder="${options.placeholder}" aria-label="${options.searchLabel}">
			${options.filterHtml || ''}
		</div>
		<div class="catalog-layout">
			<section class="catalog-browser">
				<div class="catalog-summary">正在加载资料...</div>
				<div class="catalog-list"></div>
				<div class="catalog-pagination">
					<button class="catalog-prev" type="button" aria-label="上一页">&#9664;</button>
					<span class="catalog-page"></span>
					<button class="catalog-next" type="button" aria-label="下一页">&#9654;</button>
				</div>
			</section>
			<section class="catalog-detail"><div class="empty-detail">${options.emptyDetail}</div></section>
		</div>`;

	const search = container.querySelector('.catalog-search');
	const list = container.querySelector('.catalog-list');
	const detail = container.querySelector('.catalog-detail');
	const filter = container.querySelector('.catalog-filter.game-select-value');
	mountGameSelects(container);

	function renderDetail() {
		if (!state.selected) detail.innerHTML = `<div class="empty-detail">${options.emptyDetail}</div>`;
		else options.renderDetail(detail, state.selected, api);
	}

	function renderList() {
		const page = paginateCatalog(state.filtered, state.page, options.pageSize || 30);
		state.page = page.page;
		container.querySelector('.catalog-summary').textContent = `共 ${state.filtered.length} 条资料`;
		container.querySelector('.catalog-page').textContent = `${page.page} / ${page.pageCount}`;
		container.querySelector('.catalog-prev').disabled = page.page <= 1;
		container.querySelector('.catalog-next').disabled = page.page >= page.pageCount;
		list.innerHTML = page.items.map(item => options.renderRow(item, state.selected)).join('');
		options.onListRendered?.(list, page.items, api);
		list.querySelectorAll('[data-catalog-key]').forEach(button => {
			button.addEventListener('click', () => {
				state.selected = state.items.find(item => String(options.key(item)) === button.dataset.catalogKey);
				renderList();
				renderDetail();
			});
		});
	}

	function applyFilter() {
		state.filtered = options.filter(state.items, search.value, filter?.value || 'all');
		state.page = 1;
		renderList();
	}

	const api = {
		get state() {
			return state;
		},
		setItems(items) {
			state.items = items;
			applyFilter();
		},
		selectItem(item) {
			state.selected = item || null;
			renderList();
			renderDetail();
		},
		refreshDetail: renderDetail,
		setStatus(message) {
			container.querySelector('.catalog-summary').textContent = message;
		}
	};

	search.addEventListener('input', applyFilter);
	filter?.addEventListener('change', applyFilter);
	container.querySelector('.catalog-prev').addEventListener('click', () => {
		state.page -= 1;
		renderList();
	});
	container.querySelector('.catalog-next').addEventListener('click', () => {
		state.page += 1;
		renderList();
	});
	return api;
}
