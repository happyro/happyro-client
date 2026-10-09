/** UI helpers shared by server-driven flows; device layouts are defined separately. */
export function interactionReview(lines, summary, warning = '') {
	const content = document.createElement('div');
	content.className = 'interaction-review';
	const list = document.createElement('div');
	list.className = 'interaction-review-lines';
	for (const line of lines) {
		const p = document.createElement('p');
		p.textContent = line;
		list.append(p);
	}
	const totals = document.createElement('div');
	totals.className = 'interaction-review-summary';
	const strong = document.createElement('strong');
	strong.textContent = summary;
	totals.append(strong);
	if (warning) {
		const p = document.createElement('p');
		p.className = 'interaction-warning';
		p.textContent = warning;
		list.prepend(p);
	}
	content.append(list, totals);
	return content;
}
export function interactionFooter(body) {
	const footer = document.createElement('div');
	footer.className = 'interaction-footer';
	const status = document.createElement('span');
	status.className = 'interaction-status';
	status.setAttribute('role', 'status');
	footer.append(status);
	body.append(footer);
	return { footer, status };
}
export function inputDraft(fields, changed = () => {}) {
	let values = fields.map(field => field.value);
	const dirty = () => fields.some((field, i) => field.isConnected && field.value !== values[i]);
	for (const field of fields) field.addEventListener('input', changed);
	return {
		dirty,
		accept() {
			values = fields.map(field => field.value);
			changed();
		},
		reset() {
			fields.forEach((field, i) => {
				field.value = values[i];
			});
			changed();
		},
		focus() {
			fields.find((field, i) => field.value !== values[i])?.focus();
		}
	};
}
