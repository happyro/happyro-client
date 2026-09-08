export function requestGameToolsConfirmation(container, message) {
	return new Promise(resolve => {
		const overlay = document.createElement('div');
		overlay.className = 'game-tools-confirm';
		overlay.innerHTML = '<div class="game-tools-confirm-card" role="dialog" aria-modal="true"><p></p><div><button type="button" data-cancel>取消</button><button type="button" data-confirm>确认</button></div></div>';
		overlay.querySelector('p').textContent = message;
		const finish = result => {
			overlay.remove();
			resolve(result);
		};
		overlay.querySelector('[data-cancel]').addEventListener('click', () => finish(false));
		overlay.querySelector('[data-confirm]').addEventListener('click', () => finish(true));
		container.append(overlay);
		overlay.querySelector('[data-confirm]').focus();
	});
}
