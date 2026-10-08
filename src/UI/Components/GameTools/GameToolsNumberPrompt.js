import { confirmAction } from 'UI/Components/Confirmation.js';

export function requestGameToolsNumber(container, { title, label, value, min, max }) {
	return new Promise(resolve => {
		const content = document.createElement('label');
		content.className = 'ui-confirm-field';
		const caption = document.createElement('span');
		caption.className = 'game-tools-number-label';
		caption.textContent = label;
		content.append(caption);
		const input = document.createElement('input');
		Object.assign(input, { type: 'number', min, max, value, required: true });
		input.setAttribute('aria-label', title);
		content.append(input);
		confirmAction(container, title, () => resolve(Number(input.value)), {
			content,
			cancelled: () => resolve(null)
		});
	});
}
