import GUIComponent from 'UI/GUIComponent.js';
import UIManager from 'UI/UIManager.js';
import { createGameAutoCombatRuntime } from 'UI/Game/GameAutoCombatRuntime.js';
import { createAutoCombatView } from './AutoCombatView.js';
import css from './AutoCombat.css?raw';
import panelCSS from 'UI/Game/AutoCombatPanel.css?raw';

const AutoCombat = new GUIComponent('AutoCombat', css + panelCSS);
AutoCombat.render = () => '';
AutoCombat.needFocus = false;
AutoCombat.nativeScrolling = true;
let runtime, view;

AutoCombat.onAppend = function () {
	this.onRemove();
	runtime = createGameAutoCombatRuntime({
		enabled: () => !view?.isOpen(),
		update: state => view?.update(state),
		onDisconnect: () => this.remove()
	});
	view = createAutoCombatView(this._container, runtime);
	view.update(runtime.snapshot());
};
AutoCombat.onRemove = function () {
	runtime?.destroy();
	runtime = null;
	view?.destroy();
	view = null;
};
export default UIManager.addComponent(AutoCombat);
