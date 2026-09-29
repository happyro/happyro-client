/** Inline confirmation shared by the attribute and skill menus. */
export function createPointResetControl(container, { label, description, reset, canReset, changed }) {
	const trigger = document.createElement('button');
	trigger.type = 'button';
	trigger.textContent = label;
	trigger.className = 'point-reset-button';
	const confirmation = document.createElement('div');
	confirmation.className = 'point-reset-confirm';
	confirmation.hidden = true;
	const text = document.createElement('p');
	text.textContent = description;
	const confirm = document.createElement('button');
	confirm.type = 'button';
	confirm.textContent = `确认${label}`;
	const cancel = document.createElement('button');
	cancel.type = 'button';
	cancel.textContent = '取消';
	let submitting = false;
	trigger.onclick = () => {
		if (!canReset()) return;
		confirmation.hidden = false;
		trigger.hidden = true;
	};
	cancel.onclick = () => {
		confirmation.hidden = true;
		trigger.hidden = false;
	};
	confirm.onclick = async () => {
		if (submitting || !canReset()) return;
		submitting = true;
		confirm.disabled = cancel.disabled = true;
		const request = reset();
		changed();
		await request;
		submitting = false;
		confirmation.hidden = true;
		trigger.hidden = false;
		changed();
	};
	confirmation.append(text, confirm, cancel);
	container.append(trigger, confirmation);
	return {
		update() {
			trigger.disabled = confirm.disabled = submitting || !canReset();
			cancel.disabled = submitting;
		},
		cancel() {
			if (!submitting) cancel.click();
		}
	};
}
