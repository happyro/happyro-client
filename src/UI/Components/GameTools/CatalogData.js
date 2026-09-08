export function normalizeCatalogSearch(value) {
	return String(value || '')
		.trim()
		.toLocaleLowerCase();
}

export function matchesCatalogSearch(values, search) {
	const term = normalizeCatalogSearch(search);
	if (!term) return true;
	return values.some(value =>
		String(value ?? '')
			.toLocaleLowerCase()
			.includes(term)
	);
}

export function paginateCatalog(items, page, pageSize) {
	const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
	const currentPage = Math.min(Math.max(1, page), pageCount);
	return {
		page: currentPage,
		pageCount,
		items: items.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	};
}

export function escapeCatalogHtml(value) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}
