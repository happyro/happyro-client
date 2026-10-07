import { confirmAction } from 'UI/Components/Confirmation.js';

export function requestGameToolsNumber(container, { title, label, value, min, max }) {
	return new Promise(resolve => {
		const content = document.createElement('label');
		content.textContent = label;
		const input = document.createElement('input');
		Object.assign(input, { type: 'number', min, max, value, required: true });
		input.setAttribute('aria-label', label);
		content.append(input);
		confirmAction(container, title, () => resolve(Number(input.value)), {
			content,
			cancelled: () => resolve(null)
		});
	});
}
