export function createNPCPanel(body, state) {
	body.replaceChildren();
	const text = document.createElement('div');
	text.className = 'npc-lines';
	text.textContent = (state.lines || []).join('\n');
	body.append(text);
	updateNPCCutin(body, state);
	function button(label, respond) {
		const node = document.createElement('button');
		node.type = 'button';
		node.textContent = label;
		node.onclick = respond;
		body.append(node);
	}
	if (state.kind === 'deal') {
		button('购买', () => state.respond(0));
		button('出售', () => state.respond(1));
		return;
	}
	if (state.mode === 'menu')
		for (const option of state.options) button(option.text, () => state.respond(option.value));
	if (state.mode === 'next') button('下一步', () => state.respond());
	if (state.mode === 'close') button('结束对话', () => state.respond());
	if (state.mode === 'waiting') {
		const status = document.createElement('p');
		status.textContent = '等待 NPC 回复…';
		body.append(status);
	}
	if (['number', 'text'].includes(state.mode)) {
		const form = document.createElement('form'),
			input = document.createElement('input'),
			submit = document.createElement('button'),
			error = document.createElement('p');
		input.type = 'text';
		input.inputMode = state.mode === 'number' ? 'numeric' : 'text';
		input.setAttribute('aria-label', state.mode === 'number' ? '输入数字' : '输入文字');
		input.maxLength = state.mode === 'text' ? 255 : 11;
		submit.type = 'submit';
		submit.textContent = '确定';
		error.setAttribute('role', 'status');
		form.append(input, submit, error);
		form.onsubmit = event => {
			event.preventDefault();
			const result = state.respond(input.value);
			if (typeof result === 'string') error.textContent = result;
		};
		body.append(form);
	}
}

export function updateNPCCutin(body, state) {
	let image = body.querySelector('.npc-cutin');
	if (!state.image) {
		image?.remove();
		return;
	}
	if (!image) {
		image = document.createElement('img');
		image.alt = '';
		image.className = 'npc-cutin';
		body.prepend(image);
	}
	if (image.getAttribute('src') !== state.image) image.src = state.image;
}
