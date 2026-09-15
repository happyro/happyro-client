export function showQuestList(root, listId) {
	const selectedId = listId.replace(/^#/, '').replace(/-quest-list$/, '');
	root.querySelectorAll('.quest-menu-item').forEach(item => {
		item.classList.toggle('selected', item.id === selectedId);
	});
	root.querySelectorAll('.quest-list').forEach(list => {
		list.style.display = 'none';
	});
	const list = root.querySelector(listId);
	if (list) {
		list.style.display = 'block';
	}
}
