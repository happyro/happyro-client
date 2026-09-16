export function renderCatalogEmptyState(list, message, viewAll) {
	list.innerHTML = '<div class="catalog-empty-state"><p></p></div>';
	const empty = list.firstElementChild;
	empty.querySelector('p').textContent = message;
	if (viewAll) {
		const button = document.createElement('button');
		button.type = 'button';
		button.textContent = '查看全部';
		button.addEventListener('click', viewAll);
		empty.append(button);
	}
}
