/** Draft-only inputs: closing or cancelling leaves runtime and preferences untouched. */
export function createSettingsPanel(body, service) {
	let draft = service.snapshot();
	function render() {
		body.replaceChildren();
		const form = document.createElement('form');
		form.className = 'social-form';
		form.onsubmit = event => event.preventDefault();
		const status = document.createElement('p');
		status.role = 'status';
		const heading = label => {
			const h = document.createElement('h3');
			h.textContent = label;
			form.append(h);
		};
		const field = (label, input) => {
			const row = document.createElement('label');
			row.append(document.createTextNode(label), input);
			form.append(row);
		};
		heading('画面');
		for (const [key, label, range, max, step] of service.fields) {
			const input = document.createElement(Array.isArray(range) ? 'select' : 'input');
			input.dataset.setting = key;
			if (Array.isArray(range)) {
				for (const value of range) {
					const option = document.createElement('option');
					option.value = String(value);
					option.textContent = value === -1 ? '不限制' : String(value);
					input.append(option);
				}
				input.value = String(draft.graphics[key]);
			} else if (range === undefined) {
				input.type = 'checkbox';
				input.checked = draft.graphics[key];
			} else {
				input.type = 'number';
				input.min = range;
				input.max = max;
				input.step = step;
				input.value = draft.graphics[key];
				input.inputMode = 'decimal';
			}
			input.oninput = () => {
				draft.graphics[key] = input.type === 'checkbox' ? input.checked : Number(input.value);
				status.textContent = '修改尚未保存';
			};
			field(label, input);
		}
		heading('声音');
		for (const [key, name] of [
			['BGM', '背景音乐'],
			['Sound', '音效']
		]) {
			const enabled = document.createElement('input');
			enabled.type = 'checkbox';
			enabled.checked = draft.audio[key].play;
			enabled.dataset.audio = key;
			enabled.oninput = () => {
				draft.audio[key].play = enabled.checked;
				status.textContent = '修改尚未保存';
			};
			field(name, enabled);
			const volume = document.createElement('input');
			volume.type = 'range';
			volume.min = 0;
			volume.max = 100;
			volume.step = 1;
			volume.value = draft.audio[key].volume * 100;
			volume.oninput = () => {
				draft.audio[key].volume = Number(volume.value) / 100;
				status.textContent = '修改尚未保存';
			};
			field(name + '音量', volume);
		}
		const note = document.createElement('p');
		note.textContent = '移动端尺寸随横屏窗口自适应。关闭面板会放弃尚未保存的修改。';
		form.append(note);
		for (const [label, action] of [
			[
				'保存',
				() => {
					status.textContent = service.save(draft);
				}
			],
			[
				'取消修改',
				() => {
					draft = service.snapshot();
					render();
				}
			],
			[
				'恢复默认（待保存）',
				() => {
					draft = service.snapshot(true);
					render();
				}
			]
		]) {
			const button = document.createElement('button');
			button.type = 'button';
			button.textContent = label;
			button.onclick = action;
			form.append(button);
		}
		form.append(status);
		body.append(form);
	}
	render();
}
