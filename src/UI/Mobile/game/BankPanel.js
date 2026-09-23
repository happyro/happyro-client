export function createBankPanel(body, service) {
	body.innerHTML =
		'<form class="bank-form"><dl><dt>持有 Zeny</dt><dd data-wallet></dd><dt>银行余额</dt><dd data-bank></dd></dl><label>金额<input data-amount type="number" min="1" max="2147483647" step="1" inputmode="numeric"></label><div class="inventory-actions"><button data-max="deposit">最大可存</button><button data-max="withdraw">最大可取</button><button data-action="deposit">存入</button><button data-action="withdraw">取出</button></div><p data-review></p><div class="inventory-actions"><button data-confirm hidden>确认</button><button data-cancel hidden>返回修改</button></div><p role="status"></p></form>';
	const $ = selector => body.querySelector(selector);
	let review = null;
	$('form').onsubmit = event => event.preventDefault();
	for (const button of body.querySelectorAll('button')) button.type = 'button';
	function reset() {
		review = null;
		$('[data-review]').textContent = '';
		$('[data-confirm]').hidden = true;
		$('[data-cancel]').hidden = true;
	}
	$('[data-amount]').oninput = reset;
	$('[data-cancel]').onclick = reset;
	for (const button of body.querySelectorAll('[data-max]'))
		button.onclick = () => {
			reset();
			$('[data-amount]').value = String(service.snapshot()[button.dataset.max + 'Max']);
		};
	for (const button of body.querySelectorAll('[data-action]'))
		button.onclick = () => {
			const state = service.snapshot(),
				amount = Number($('[data-amount]').value),
				action = button.dataset.action;
			if (!state.allowed || !Number.isInteger(amount) || amount <= 0 || amount > state[action + 'Max']) {
				$('[role=status]').textContent = '请填写有效金额';
				reset();
				return;
			}
			review = { action, amount };
			$('[data-review]').textContent =
				`${action === 'deposit' ? '存入' : '取出'} ${amount.toLocaleString()} Zeny？`;
			$('[data-confirm]').hidden = false;
			$('[data-cancel]').hidden = false;
		};
	$('[data-confirm]').onclick = () => {
		if (!review) return;
		const { action, amount } = review;
		reset();
		$('[role=status]').textContent = service.submit(action, amount);
		update();
	};
	let lastMessage = '';
	function update() {
		const state = service.snapshot();
		$('[data-wallet]').textContent = Number(state.wallet).toLocaleString();
		$('[data-bank]').textContent = Number(state.balance).toLocaleString();
		for (const button of body.querySelectorAll('button')) button.disabled = !state.allowed;
		$('[data-amount]').disabled = !state.allowed;
		if (state.message !== lastMessage) {
			lastMessage = state.message;
			$('[role=status]').textContent = state.message;
		}
	}
	update();
	return { update };
}
