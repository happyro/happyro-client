import { confirmAction } from 'UI/Components/Confirmation.js';
import { createFeedback } from 'UI/Components/Feedback.js';
import { setListItemText } from './ListItemText.js';

/** Separate slot selection, candidate browsing and editing without jumping scroll position. */
export function createShortcutPanel(body, actions) {
	let index, selected, dismiss;
	body.innerHTML = `
		<div class="shortcut-pages"><button type="button" data-page-step="-1" aria-label="上一组快捷键">‹</button><div class="slot-picker" role="group" aria-label="选择快捷键"></div><button type="button" data-page-step="1" aria-label="下一组快捷键">›</button></div>
		<div class="shortcut-layout">
			<section class="shortcut-browser"><div class="shortcut-choices"></div></section>
			<section class="shortcut-editor" aria-label="编辑快捷键">
				<div class="shortcut-current"><strong data-slot-title></strong><span data-current></span></div>
				<p data-choice-hint>从左侧选择技能或道具，再保存到当前位置。</p>
				<form class="shortcut-config" hidden>
					<div class="shortcut-selected"><img alt="" data-choice-icon><strong data-choice></strong></div>
					<label class="shortcut-level">施放等级 <select aria-label="技能等级"></select></label>
					<button type="submit" data-save-slot aria-live="polite"></button>
					<button type="button" data-cancel-choice>取消选择</button>
				</form>
				<div class="shortcut-clear"><button type="button" data-clear-slot>清空当前位置</button>
				</div>

			</section>
		</div>`;
	const $ = selector => body.querySelector(selector);
	const picker = $('.slot-picker'),
		choices = $('.shortcut-choices'),
		form = $('form');
	const status = createFeedback(body);
	function resetSaveFeedback() {
		const button = $('[data-save-slot]');
		button.textContent = `保存到位置 ${index + 1}`;
		delete button.dataset.saveState;
	}
	form.oninput = () => {
		resetSaveFeedback();
	};
	const slots = () => actions.snapshot().slots.filter(entry => !entry.unavailable);
	function updateSlotLabels() {
		const snapshot = actions.snapshot();
		const visible = snapshot.slots.filter(entry => !entry.unavailable);
		const key = visible.map(slot => slot.index).join(',');
		if (picker.dataset.slots !== key) {
			dismiss?.();
			dismiss = null;
			picker.replaceChildren();
			for (const slot of visible) {
				const button = document.createElement('button');
				button.type = 'button';
				button.dataset.index = slot.index;
				const title = document.createElement('strong');
				title.textContent = `位置 ${slot.index + 1}`;
				button.append(title, document.createElement('span'));
				button.onclick = () => chooseSlot(slot.index);
				picker.append(button);
			}
			picker.dataset.slots = key;
			if (!visible.some(slot => slot.index === index)) index = visible[0]?.index ?? 0;
			cancelChoice();
		}
		for (const button of body.querySelectorAll('[data-page-step]')) button.disabled = snapshot.pages <= 1;
		for (const slot of visible) {
			const button = picker.querySelector(`[data-index="${slot.index}"]`);
			if (button) {
				button.querySelector('span').textContent =
					`${slot.name}${slot.binding?.isSkill ? ` · Lv.${slot.binding.count}` : ''}`;
				button.setAttribute('aria-pressed', String(slot.index === index));
			}
			if (slot.index === index) {
				$('[data-slot-title]').textContent = `位置 ${index + 1}`;
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
		resetSaveFeedback();
		form.hidden = true;
		$('[data-choice-hint]').hidden = false;
		highlightChoices();
	}
	function chooseSlot(next) {
		dismiss?.();
		dismiss = null;
		index = next;
		cancelChoice();
		$('[data-clear-slot]').hidden = false;
		status('');
		updateSlotLabels();
	}
	for (const button of body.querySelectorAll('[data-page-step]')) {
		button.onclick = () => {
			actions.turn(Number(button.dataset.pageStep));
			chooseSlot(slots()[0]?.index ?? 0);
		};
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
		setListItemText(button, entry.name, String(entry.amount));
		button.onclick = () => {
			selected = entry;
			form.hidden = false;
			$('[data-choice-hint]').hidden = true;
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
			resetSaveFeedback();
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
			status(`已保存到位置 ${index + 1}`, 'success');
		} else {
			status('保存失败，技能或物品已变化，请重新选择。', 'error');
		}
	};
	$('[data-cancel-choice]').onclick = () => {
		cancelChoice();
		status('');
	};
	$('[data-clear-slot]').onclick = () => {
		const slotIndex = index;
		dismiss = confirmAction(
			body,
			`清空位置 ${slotIndex + 1} 的「${slots().find(slot => slot.index === slotIndex)?.name}」？`,
			() => {
				if (actions.configure(slotIndex, null)) {
					chooseSlot(slotIndex);
					status(`位置 ${slotIndex + 1} 已清空`, 'success');
				} else status('清空失败，请重新选择位置。', 'error');
			},
			{}
		);
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
				setListItemText(button, entry.name, String(entry.amount));
				if (selected && button.dataset.key === `${selected.isSkill}:${selected.ID}` && entry.icon) {
					$('[data-choice-icon]').src = entry.icon;
					$('[data-choice-icon]').hidden = false;
				}
			}
		}
	};
}
