/** Draft-only inputs: closing or cancelling leaves runtime and preferences untouched. */
export function createSettingsPanel(body, service) {
	let draft = service.snapshot();
	let activeSection = '画面';
	function render() {
		body.replaceChildren();
		const form = document.createElement('form');
		form.className = 'settings-form';
		form.onsubmit = event => event.preventDefault();
		const status = document.createElement('p');
		status.role = 'status';
		status.className = 'settings-status';
		status.textContent = '关闭面板会放弃尚未保存的修改。';
		const tabs = document.createElement('div');
		tabs.className = 'settings-tabs';
		tabs.setAttribute('role', 'group');
		tabs.setAttribute('aria-label', '设置分类');
		const content = document.createElement('div');
		content.className = 'settings-content';
		const sections = new Map();
		for (const name of ['画面', '特效', '声音']) {
			const section = document.createElement('section');
			section.className = 'settings-section';
			section.setAttribute('aria-label', name);
			section.hidden = name !== activeSection;
			const button = document.createElement('button');
			button.type = 'button';
			button.textContent = name;
			button.setAttribute('aria-pressed', String(name === activeSection));
			button.onclick = () => {
				activeSection = name;
				for (const [label, entry] of sections) {
					entry.section.hidden = label !== name;
					entry.button.setAttribute('aria-pressed', String(label === name));
				}
				content.scrollTop = 0;
			};
			sections.set(name, { section, button });
			tabs.append(button);
			content.append(section);
		}
		form.append(tabs, content);
		const field = (section, label, input) => {
			const row = document.createElement('label');
			row.className = 'settings-field';
			const caption = document.createElement('span');
			caption.textContent = label;
			row.append(caption, input);
			sections.get(section).section.append(row);
			return row;
		};
		const displayKeys = ['quality', 'fpslimit', 'performanceMode', 'viewArea', 'cursor', 'pixelPerfectSprites'];
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
			field(displayKeys.includes(key) ? '画面' : '特效', key === 'quality' ? '渲染比例（%）' : label, input);
		}
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
			field('声音', name, enabled);
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
			const row = field('声音', name + '音量', volume);
			row.classList.add('settings-volume');
			const value = document.createElement('span');
			value.className = 'settings-volume-value';
			value.textContent = `${volume.value}%`;
			volume.addEventListener('input', () => {
				value.textContent = `${volume.value}%`;
			});
			row.append(value);
		}
		const footer = document.createElement('div');
		footer.className = 'settings-footer';
		const buttons = document.createElement('div');
		buttons.className = 'settings-actions';
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
			button.onclick = () => {
				action();
				if (!form.isConnected) body.querySelector('.settings-tabs [aria-pressed=true]')?.focus();
			};
			if (label === '保存') button.className = 'settings-save';
			buttons.append(button);
		}
		footer.append(buttons, status);
		form.append(footer);
		body.append(form);
	}
	render();
}
