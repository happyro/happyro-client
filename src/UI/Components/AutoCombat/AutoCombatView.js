import { createAutoCombatPanel } from 'UI/Game/AutoCombatPanel.js';
import { createPickupSettingsPanel } from 'UI/Game/PickupSettingsPanel.js';

/** Desktop presentation; gameplay and persistence remain in the shared services. */
export function createAutoCombatView(root, actions, pickup) {
	root.innerHTML = `
		<button type="button" class="combat-launcher" data-settings aria-label="战斗辅助" title="战斗辅助" aria-haspopup="dialog" aria-expanded="false">
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 3-.7 2.4-2 .9L4 5.7 2 9l1.8 1.8v2.4L2 15l2 3.3 2.3-.6 2 .9L9 21h6l.7-2.4 2-.9 2.3.6 2-3.3-1.8-1.8v-2.4L22 9l-2-3.3-2.3.6-2-.9L15 3Z"/><circle cx="12" cy="12" r="3.5"/></svg>
			<span class="combat-indicator" hidden></span>
		</button>
		<div class="combat-backdrop" hidden>
			<section class="combat-dialog" role="dialog" aria-modal="true" aria-labelledby="combat-title">
				<header><div><h2 id="combat-title">战斗辅助</h2><span class="combat-subtitle">自动战斗与地面物品拾取</span></div><button type="button" data-close aria-label="关闭战斗辅助">关闭</button></header>
				<div class="combat-runtime"><div><strong>自动战斗</strong><span class="combat-status" role="status" data-status></span></div><button type="button" data-toggle aria-pressed="false">开始战斗</button></div>
				<div class="combat-tabs" role="tablist" aria-label="战斗辅助配置">
					<button type="button" role="tab" id="combat-tab" aria-controls="combat-panel" aria-selected="true" data-tab="combat">自动战斗</button>
					<button type="button" role="tab" id="pickup-tab" aria-controls="pickup-panel" aria-selected="false" tabindex="-1" data-tab="pickup">自动拾取</button>
				</div>
				<div id="combat-panel" role="tabpanel" aria-labelledby="combat-tab" class="auto-config-body"></div>
				<div id="pickup-panel" role="tabpanel" aria-labelledby="pickup-tab" class="desktop-pickup-panel" hidden>
					<div class="desktop-pickup-scroll"></div>
				</div>
			</section>
		</div>`;
	const $ = selector => root.querySelector(selector);
	const abort = new AbortController();
	const backdrop = $('.combat-backdrop');

	let pickupEditor;
	function finishClose() {
		pickupEditor?.flush();
		pickupEditor?.destroy();
		pickupEditor?.footer.remove();
		backdrop.hidden = true;

		$('.auto-config-body').replaceChildren();
		$('.desktop-pickup-scroll').replaceChildren();
		$('[data-settings]').setAttribute('aria-expanded', 'false');
		$('[data-settings]').focus();
	}
	function close() {
		if (!backdrop.hidden) finishClose();
	}
	function selectTab(name) {
		for (const button of root.querySelectorAll('[data-tab]')) {
			const selected = button.dataset.tab === name;
			button.setAttribute('aria-selected', String(selected));
			button.tabIndex = selected ? 0 : -1;
		}
		$('#combat-panel').hidden = name !== 'combat';
		$('#pickup-panel').hidden = name !== 'pickup';
	}
	function open() {
		if (!backdrop.hidden) return;
		createAutoCombatPanel($('.auto-config-body'), actions);
		pickupEditor = createPickupSettingsPanel(
			$('.desktop-pickup-scroll'),
			structuredClone(pickup.load()),
			pickup.save
		);
		$('#pickup-panel').append(pickupEditor.footer);
		selectTab('combat');
		backdrop.hidden = false;
		$('[data-settings]').setAttribute('aria-expanded', 'true');
		update(actions.snapshot());
		$('[data-close]').focus();
	}
	$('[data-toggle]').onclick = () => {
		if (actions.snapshot().active) actions.stop();
		else if (!actions.start()) actions.stop('当前不能开始自动战斗');
		update(actions.snapshot());
	};
	for (const button of root.querySelectorAll('[data-tab]')) {
		button.onclick = () => selectTab(button.dataset.tab);
		button.onkeydown = event => {
			if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
			event.preventDefault();
			const name =
				event.key === 'Home'
					? 'combat'
					: event.key === 'End'
						? 'pickup'
						: button.dataset.tab === 'combat'
							? 'pickup'
							: 'combat';
			selectTab(name);
			$(`[data-tab="${name}"]`).focus();
		};
	}
	$('[data-settings]').onclick = open;
	$('[data-close]').onclick = close;
	backdrop.addEventListener(
		'click',
		event => {
			if (event.target === backdrop) close();
		},
		{ signal: abort.signal }
	);
	root.addEventListener(
		'keydown',
		event => {
			if (backdrop.hidden) return;
			event.stopPropagation();
			if (event.key === 'Escape') {
				event.preventDefault();
				close();
			}
			if (event.key === 'Tab') {
				const focusable = [
					...$('.combat-dialog').querySelectorAll('button, input, select, textarea, [tabindex]')
				].filter(el => !el.matches(':disabled') && el.tabIndex >= 0 && !el.closest('[hidden]'));
				const first = focusable[0],
					last = focusable.at(-1);
				const active = root.getRootNode().activeElement || document.activeElement;
				if (event.shiftKey && active === first) {
					last.focus();
					event.preventDefault();
				} else if (!event.shiftKey && active === last) {
					first.focus();
					event.preventDefault();
				}
			}
		},
		{ signal: abort.signal }
	);
	// Prevent release shortcuts from reaching the game while typing in settings.
	root.addEventListener(
		'keyup',
		event => {
			if (!backdrop.hidden) event.stopPropagation();
		},
		{ signal: abort.signal }
	);
	function update(state) {
		$('[data-toggle]').textContent = state.active ? '停止战斗' : '开始战斗';
		$('[data-toggle]').setAttribute('aria-pressed', String(state.active));
		$('[data-status]').textContent = state.status;
		const picking = pickup.load().enabled;
		$('.combat-indicator').hidden = !state.active && !picking;
		$('[data-settings]').title =
			`战斗辅助 · 战斗${state.active ? '开启' : '关闭'} · 拾取${picking ? '开启' : '关闭'}`;
	}
	return {
		update,
		open,
		close,
		isOpen: () => !backdrop.hidden,
		destroy() {
			pickupEditor?.destroy();
			pickupEditor?.footer.remove();
			abort.abort();
			root.replaceChildren();
		}
	};
}
