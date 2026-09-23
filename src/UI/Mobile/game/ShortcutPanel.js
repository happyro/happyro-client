/** Separate slot selection, candidate browsing and editing without jumping scroll position. */
export function createShortcutPanel(body, actions) {
	let index, selected;
	body.innerHTML = `
		<div class="slot-picker" role="group" aria-label="选择快捷槽"></div>
		<div class="shortcut-layout">
			<section class="shortcut-browser"><div class="shortcut-choices"></div></section>
			<section class="shortcut-editor" aria-label="编辑快捷槽">
				<div class="shortcut-current"><strong data-slot-title></strong><span data-current></span></div>
				<p data-choice-hint>从左侧选择技能或道具，再保存到当前槽位。</p>
				<form class="shortcut-config" hidden>
					<div class="shortcut-selected"><img alt="" data-choice-icon><strong data-choice></strong></div>
					<label class="shortcut-level">施放等级 <select aria-label="技能等级"></select></label>
					<button type="submit" data-save-slot></button>
					<button type="button" data-cancel-choice>取消选择</button>
				</form>
				<div class="shortcut-clear"><button type="button" data-clear-slot>清空当前槽位</button>
					<div data-clear-confirm hidden><p data-clear-question></p><div class="shortcut-clear-actions"><button type="button" data-confirm-clear>确认清空</button><button type="button" data-cancel-clear>取消</button></div></div>
				</div>
				<p role="status" data-config-status></p>
			</section>
		</div>`;
	const $ = selector => body.querySelector(selector);
	const picker = $('.slot-picker'),
		choices = $('.shortcut-choices'),
		form = $('form');
	const status = message => {
		$('[data-config-status]').textContent = message;
	};
	const slots = () => actions.snapshot().slots.filter(entry => !entry.unavailable);
	function updateSlotLabels() {
		for (const slot of slots()) {
			const button = picker.querySelector(`[data-index="${slot.index}"]`);
			if (button) {
				button.querySelector('span').textContent = slot.name;
				button.setAttribute('aria-pressed', String(slot.index === index));
			}
			if (slot.index === index) {
				$('[data-slot-title]').textContent = `槽位 ${index + 1}`;
				$('[data-current]').textContent = `当前：${slot.name}${slot.amount ? ` · ${slot.amount}` : ''}`;
				$('[data-clear-slot]').disabled = slot.empty;
			}
		}
	}
	function highlightChoices() {
		for (const button of choices.children)
			button.setAttribute(
				'aria-pressed',
				String(Boolean(selected && button.dataset.key === `${selected.isSkill}:${selected.ID}`))
			);
	}
	function cancelChoice() {
		selected = null;
		form.hidden = true;
		$('[data-choice-hint]').hidden = false;
		highlightChoices();
	}
	function chooseSlot(next) {
		index = next;
		cancelChoice();
		$('[data-clear-confirm]').hidden = true;
		$('[data-clear-slot]').hidden = false;
		status('');
		updateSlotLabels();
	}
	for (const slot of slots()) {
		const button = document.createElement('button');
		button.type = 'button';
		button.dataset.index = slot.index;
		const title = document.createElement('strong'),
			name = document.createElement('span');
		title.textContent = `槽位 ${slot.index + 1}`;
		button.append(title, name);
		button.onclick = () => chooseSlot(slot.index);
		picker.append(button);
	}
	for (const entry of actions.candidates()) {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'shortcut-choice';
		button.dataset.key = `${entry.isSkill}:${entry.ID}`;
		button.setAttribute('aria-pressed', 'false');
		const img = document.createElement('img'),
			label = document.createElement('span');
		img.alt = '';
		if (entry.icon) img.src = entry.icon;
		label.textContent = `${entry.name} · ${entry.amount}`;
		button.append(img, label);
		button.onclick = () => {
			selected = entry;
			form.hidden = false;
			$('[data-choice-hint]').hidden = true;
			$('[data-clear-confirm]').hidden = true;
			$('[data-clear-slot]').hidden = false;
			$('[data-choice]').textContent = entry.name;
			$('[data-choice-icon]').hidden = !entry.icon;
			if (entry.icon) $('[data-choice-icon]').src = entry.icon;
			$('.shortcut-level').hidden = !entry.isSkill;
			const select = $('select');
			select.replaceChildren();
			if (entry.isSkill)
				for (let level = 1; level <= entry.level; level++) select.add(new Option(`Lv.${level}`, String(level)));
			const current = slots().find(slot => slot.index === index)?.binding;
			select.value = String(
				entry.isSkill && current?.isSkill && current.ID === entry.ID
					? Math.min(current.count, entry.level)
					: entry.level || 1
			);
			$('[data-save-slot]').textContent = `保存到槽位 ${index + 1}`;
			highlightChoices();
			status('');
		};
		choices.append(button);
	}
	if (!choices.children.length) choices.textContent = '暂无可配置的技能或道具';
	form.onsubmit = event => {
		event.preventDefault();
		if (selected && actions.configure(index, selected, Number($('select').value))) {
			updateSlotLabels();
			status(`已保存到槽位 ${index + 1}`);
		} else status('保存失败，技能或物品已变化，请重新选择。');
	};
	$('[data-cancel-choice]').onclick = () => {
		cancelChoice();
		status('');
	};
	$('[data-clear-slot]').onclick = () => {
		cancelChoice();
		status('');
		$('[data-clear-question]').textContent =
			`清空槽位 ${index + 1} 的「${slots().find(slot => slot.index === index)?.name}」？`;
		$('[data-clear-confirm]').hidden = false;
		$('[data-clear-slot]').hidden = true;
	};
	$('[data-cancel-clear]').onclick = () => {
		$('[data-clear-confirm]').hidden = true;
		$('[data-clear-slot]').hidden = false;
	};
	$('[data-confirm-clear]').onclick = () => {
		if (actions.configure(index, null)) {
			chooseSlot(index);
			status(`槽位 ${index + 1} 已清空`);
		} else status('清空失败，请重新选择槽位。');
	};
	chooseSlot(actions.index ?? slots()[0]?.index ?? 0);
	return {
		updateIcons(entries) {
			updateSlotLabels();
			const byKey = new Map(entries.map(entry => [`${entry.isSkill}:${entry.ID}`, entry]));
			for (const button of choices.children) {
				const entry = byKey.get(button.dataset.key);
				if (!entry) continue;
				const img = button.querySelector('img');
				if (entry.icon && img.getAttribute('src') !== entry.icon) img.src = entry.icon;
				button.querySelector('span').textContent = `${entry.name} · ${entry.amount}`;
				if (selected && button.dataset.key === `${selected.isSkill}:${selected.ID}` && entry.icon) {
					$('[data-choice-icon]').src = entry.icon;
					$('[data-choice-icon]').hidden = false;
				}
			}
		}
	};
}
