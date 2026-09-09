export function requestGameToolsNumber(container, { title, label, value, min, max }) {
	return new Promise(resolve => {
		const overlay = document.createElement('div');
		overlay.className = 'game-tools-confirm';
		overlay.innerHTML = `<div class="game-tools-confirm-card"><p>${title}</p><label class="game-tools-number-prompt">${label}<input type="number" min="${min}" max="${max}" value="${value}" required></label><div><button type="button" data-cancel>取消</button><button type="button" data-confirm>确认</button></div></div>`;
		container.closest('.game-tools-window').appendChild(overlay);
		const input = overlay.querySelector('input');
		const finish = result => {
			overlay.remove();
			resolve(result);
		};
		overlay.querySelector('[data-cancel]').addEventListener('click', () => finish(null));
		overlay.querySelector('[data-confirm]').addEventListener('click', () => {
			if (!input.reportValidity()) return;
			finish(Number(input.value));
		});
		input.focus();
		input.select();
	});
}
