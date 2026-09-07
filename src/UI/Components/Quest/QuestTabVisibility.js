export function showQuestList(root, listId) {
	root.querySelectorAll('.quest-list').forEach(list => {
		list.style.display = 'none';
	});
	const list = root.querySelector(listId);
	if (list) {
		list.style.display = 'block';
	}
}
