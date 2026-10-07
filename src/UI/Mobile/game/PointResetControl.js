import { confirmAction } from 'UI/Components/Confirmation.js';

/** Confirm before resetting, while callers own their live server feedback. */
export function createPointResetControl(container, { label, description, reset, canReset, changed }) {
	const trigger = document.createElement('button');
	trigger.type = 'button';
	trigger.textContent = label;
	trigger.className = 'point-reset-button';
	let submitting = false,
		dismiss;
	trigger.onclick = () => {
		if (submitting || !canReset()) return;
		dismiss = confirmAction(container, description, async () => {
			dismiss = null;
			if (submitting || !canReset()) return;
			submitting = true;
			try {
				const request = reset();
				changed();
				await request;
			} finally {
				submitting = false;
				changed();
			}
		});
	};
	container.append(trigger);
	return {
		update() {
			trigger.disabled = submitting || !canReset();
		},
		cancel() {
			dismiss?.();
			dismiss = null;
		}
	};
}
