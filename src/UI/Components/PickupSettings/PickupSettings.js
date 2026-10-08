import GUIComponent from 'UI/GUIComponent.js';
import UIManager from 'UI/UIManager.js';
import { createSettingsPanel } from 'UI/Mobile/game/SettingsPanel.js';
import { graphicsFields, settingsSnapshot, saveGameSettings } from 'UI/Game/GameSettings.js';
import { adjustCamera } from 'UI/Game/GameCommands.js';
import { notifyGameInput } from 'Controls/GameInputIntent.js';
import baseCSS from 'UI/Components/AutoCombat/AutoCombat.css?raw';
import settingsCSS from 'UI/Mobile/game/GameHUDResponsive.css?raw';
import pickupCSS from 'UI/Game/PickupSettingsPanel.css?raw';

const component = new GUIComponent(
	'PickupSettings',
	baseCSS +
		settingsCSS +
		pickupCSS +
		`
:host { inset: 0; z-index: 1100 !important; }
.combat-dialog { height: min(620px, calc(100dvh - 32px)); }
.settings-body { min-height: 0; }
`
);
component.render = () =>
	'<div class="combat-backdrop"><section class="combat-dialog" role="dialog" aria-label="设置"><header><h2>设置</h2><button type="button" data-close>关闭</button></header><div class="settings-body"></div></section></div>';
component.onAppend = function () {
	notifyGameInput('action');
	const root = this.getRoot();
	this._container.onkeydown = handleKeyDown.bind(this);
	root.querySelector('[data-close]').onclick = () => this.remove();
	createSettingsPanel(
		root.querySelector('.settings-body'),
		{ fields: graphicsFields, snapshot: settingsSnapshot, save: saveGameSettings, camera: adjustCamera },
		'拾取'
	);
	root.querySelector('[data-close]').focus();
};
function handleKeyDown(event) {
	if (event.key === 'Escape') {
		this.remove();
		event.preventDefault();
	}
	if (event.key === 'Tab') {
		const root = this.getRoot();
		const controls = [...root.querySelectorAll('button, input, select')].filter(
			node => !node.matches(':disabled') && node.getClientRects().length
		);
		const first = controls[0],
			last = controls.at(-1),
			active = root.activeElement;
		if (event.shiftKey && active === first) {
			last?.focus();
			event.preventDefault();
		} else if (!event.shiftKey && active === last) {
			first?.focus();
			event.preventDefault();
		}
	}
	event.stopPropagation();
}
export default UIManager.addComponent(component);
