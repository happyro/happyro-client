/** Keep the full name in the DOM while each list controls its own line limit. */
export function setListItemText(node, name, metadata = '') {
	let text = node.querySelector(':scope > span');
	if (!text) {
		for (const child of [...node.childNodes]) if (child.nodeType === Node.TEXT_NODE) child.remove();
		text = document.createElement('span');
		node.append(text);
	}
	if (!text.classList.contains('list-item-text')) {
		text.className = 'list-item-text';
		const label = document.createElement('span');
		label.className = 'list-item-name';
		const detail = document.createElement('small');
		detail.className = 'list-item-meta';
		text.replaceChildren(label, detail);
	}
	const label = text.querySelector('.list-item-name');
	const detail = text.querySelector('.list-item-meta');
	const title = String(name ?? '');
	if (label.textContent !== title) label.textContent = title;
	const suffix = metadata ? ` ${metadata}` : '';
	if (detail.textContent !== suffix) detail.textContent = suffix;
	detail.hidden = !metadata;
	node.title = `${title}${suffix}`;
	detail.title = String(metadata);
}
