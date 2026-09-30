import { createMobileInputEditor } from './MobileInputEditor.js';
import mobileSelectCSS from './MobileSelect.css?raw';
import { createMobileViewport } from './MobileViewport.js';
import GUIComponent from 'UI/GUIComponent.js';
import UIManager from 'UI/UIManager.js';
import RotationGuard from 'UI/RotationGuard.js';
import Session from 'Engine/SessionStorage.js';
import { onConnectionEnd } from 'Network/ConnectionLifecycle.js';
import { availableGameToolsTabs } from 'UI/Components/GameTools/GameToolsTabs.js';
import { loadAdventureControlBootstrap } from 'UI/Components/GameTools/AdventureControlService.js';
import { subscribeAdventureActions } from 'UI/Components/GameTools/AdventureActionService.js';
import { notifyGameInput } from 'Controls/GameInputIntent.js';
import { createAdventureToolsView } from './AdventureToolsView.js';
import baseCSS from 'UI/Components/GameTools/GameTools.css?raw';
import itemCSS from 'UI/Components/GameTools/ItemCatalogTab.css?raw';
import selectCSS from 'UI/Components/GameTools/GameSelect.css?raw';
import mobileCSS from './AdventureTools.css?raw';

const Tools = new GUIComponent('MobileAdventureTools', baseCSS + itemCSS + selectCSS + mobileCSS + mobileSelectCSS);
Tools.render = () => '<div class="adventure-mount"></div>';
Tools.needFocus = false;
Tools.nativeScrolling = true;
let view,
	disposers = [],
	generation = 0,
	abort,
	previousFreeze,
	inputOwned = false;

Tools.openMap = function (target) {
	this.initialMap = target;
	this.append();
};
Tools.onAppend = async function () {
	const initialMap = this.initialMap;
	this.initialMap = null;
	this.onRemove();
	const request = ++generation;
	notifyGameInput('action');
	previousFreeze = Session.FreezeUI;
	inputOwned = true;
	Session.FreezeUI = true;
	disposers.push(RotationGuard.allowPortraitPanel(this._host));
	abort = new AbortController();
	const mount = this.getRoot().querySelector('.adventure-mount');
	const context = { capabilities: {}, mobile: true, initialMap };
	view = createAdventureToolsView(mount, { tabs: [], context, close: () => this.remove() });

	disposers.push(onConnectionEnd(() => this.remove()));
	const viewport = createMobileViewport(this._host);
	disposers.push(viewport.destroy, createMobileInputEditor(this._host));
	window.visualViewport?.addEventListener('resize', viewport, { signal: abort.signal });
	window.visualViewport?.addEventListener('scroll', viewport, { signal: abort.signal });
	window.addEventListener('resize', viewport, { signal: abort.signal });
	this.getRoot().addEventListener('focusin', viewport, { signal: abort.signal });
	this.getRoot().addEventListener('focusout', () => queueMicrotask(viewport), { signal: abort.signal });
	viewport();
	let capabilities,
		unavailable = false;
	try {
		capabilities = { ...(await loadAdventureControlBootstrap()), adminAvailable: true };
	} catch {
		capabilities = { adminAvailable: false };
		unavailable = true;
	}
	if (request !== generation || !Session.Playing) return;
	context.capabilities = capabilities;
	view.setTabs(availableGameToolsTabs(capabilities));
	disposers.push(subscribeAdventureActions(state => view?.feedback(state.message, state.error)));
	if (unavailable) view.feedback('后台暂不可用，部分功能不可用；关闭后重试。', true);
};
Tools.onRemove = function () {
	generation++;
	if (inputOwned) Session.FreezeUI = previousFreeze;
	inputOwned = false;
	abort?.abort();
	abort = null;
	for (const dispose of disposers) dispose();
	disposers = [];
	view?.destroy();
	view = null;
};
export default UIManager.addComponent(Tools);
