import { createAutoCombatPanel } from 'UI/Game/AutoCombatPanel.js';

/** Desktop presentation only; all combat and persisted settings belong to the shared runtime. */
export function createAutoCombatView(root, actions) {
	root.innerHTML = `
		<section class="combat-bar" aria-label="自动战斗">
			<div class="combat-actions"><button type="button" data-toggle aria-pressed="false">自动战斗</button><button type="button" data-settings>战斗设置</button></div>
			<span class="combat-status" role="status" data-status>自动战斗已停止</span>
		</section>
		<div class="combat-backdrop" hidden>
			<section class="combat-dialog" role="dialog" aria-modal="true" aria-labelledby="combat-title">
				<header><h2 id="combat-title">自动战斗设置</h2><button type="button" data-close aria-label="关闭自动战斗设置">关闭</button></header>
				<div class="auto-config-body"></div>
			</section>
		</div>`;
	const $ = selector => root.querySelector(selector);
	const abort = new AbortController();
	const backdrop = $('.combat-backdrop');
	function close() {
		if (backdrop.hidden) return;
		backdrop.hidden = true;
		$('.auto-config-body').replaceChildren();
		$('[data-settings]').focus();
	}
	function open() {
		actions.stop();
		createAutoCombatPanel($('.auto-config-body'), { ...actions, close });
		backdrop.hidden = false;
		$('[data-close]').focus();
	}
	$('[data-toggle]').onclick = () => {
		if (actions.snapshot().active) actions.stop();
		else if (!actions.start()) {
			actions.stop('当前不能开始自动战斗');
			update(actions.snapshot());
			return;
		}
		update(actions.snapshot());
	};
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
			if (event.key === 'Escape') {
				if (!backdrop.hidden) close();
				else actions.stop();
				event.preventDefault();
				event.stopPropagation();
			}
			// Modal editing must not trigger gameplay shortcuts behind the dialog.
			if (!backdrop.hidden) event.stopPropagation();
			if (!backdrop.hidden && event.key === 'Tab') {
				const focusable = [...$('.combat-dialog').querySelectorAll(':is(button, input):not(:disabled)')];
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
	function update(state) {
		$('[data-toggle]').textContent = state.active ? '停止战斗' : '自动战斗';
		$('[data-toggle]').setAttribute('aria-pressed', String(state.active));
		$('[data-status]').textContent = state.status;
	}
	return {
		update,
		close,
		isOpen: () => !backdrop.hidden,
		destroy() {
			abort.abort();
			root.replaceChildren();
		}
	};
}
