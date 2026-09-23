/** Tap-only configuration; the chosen level remains stable during live HUD refreshes. */
export function createShortcutPanel(body, actions) {
	let index, selected;
	body.innerHTML =
		'<p>与桌面快捷栏共享配置。选择槽位，再选择技能或道具。</p><div class="slot-picker"></div><div class="shortcut-choices"></div><form class="shortcut-config" hidden><span data-choice></span><label>等级 <select aria-label="技能等级"></select></label><button type="submit">保存</button></form><button type="button" data-clear-slot>清空槽位</button><p role="status" data-config-status></p>';
	const $ = s => body.querySelector(s);
	const picker = $('.slot-picker'),
		choices = $('.shortcut-choices'),
		form = $('form');
	form.after($('[data-clear-slot]'), choices);
	function chooseSlot(next) {
		index = next;
		selected = null;
		form.hidden = true;
		for (const button of picker.children)
			button.setAttribute('aria-pressed', String(Number(button.dataset.index) === index));
		$('[data-config-status]').textContent = `正在配置槽位 ${index + 1}`;
	}
	for (const slot of actions.snapshot().slots) {
		const button = document.createElement('button');
		button.type = 'button';
		button.dataset.index = slot.index;
		button.textContent = `${slot.index + 1} · ${slot.name}`;
		button.onclick = () => chooseSlot(slot.index);
		picker.append(button);
	}
	function renderChoices() {
		const entries = actions.candidates();
		for (const entry of entries) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'shortcut-choice';
			button.dataset.key = `${entry.isSkill}:${entry.ID}`;
			const img = document.createElement('img');
			img.alt = '';
			if (entry.icon) img.src = entry.icon;
			const label = document.createElement('span');
			label.textContent = `${entry.name} · ${entry.amount}`;
			button.append(img, label);
			button.onclick = () => {
				selected = entry;
				form.hidden = false;
				$('[data-choice]').textContent = entry.name;
				$('label').hidden = !entry.isSkill;
				const select = $('select');
				select.replaceChildren();
				if (entry.isSkill)
					for (let level = 1; level <= entry.level; level++)
						select.add(new Option(String(level), String(level)));
				select.value = String(entry.level || 1);
				body.scrollTop = 0;
			};
			choices.append(button);
		}
		if (!entries.length) choices.textContent = '当前没有可配置的主动技能或可用道具';
	}
	form.onsubmit = event => {
		event.preventDefault();
		if (selected && actions.configure(index, selected, Number($('select').value))) actions.saved();
		else $('[data-config-status]').textContent = '配置失败，请重新选择；技能或物品可能已经变化';
	};
	$('[data-clear-slot]').onclick = () => {
		if (actions.configure(index, null)) actions.saved();
	};
	renderChoices();
	chooseSlot(actions.index ?? actions.snapshot().slots[0]?.index ?? 0);
	return {
		updateIcons(entries) {
			const byKey = new Map(entries.map(entry => [`${entry.isSkill}:${entry.ID}`, entry]));
			for (const button of choices.children) {
				const entry = byKey.get(button.dataset.key);
				if (!entry) continue;
				const img = button.querySelector('img');
				if (entry.icon && img.getAttribute('src') !== entry.icon) img.src = entry.icon;
				button.querySelector('span').textContent = `${entry.name} · ${entry.amount}`;
			}
		}
	};
}
