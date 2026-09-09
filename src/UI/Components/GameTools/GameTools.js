import GUIComponent from 'UI/GUIComponent.js';
import UIManager from 'UI/UIManager.js';
import Preferences from 'Core/Preferences.js';
import htmlText from './GameTools.html?raw';
import cssText from './GameTools.css?raw';
import itemCatalogCssText from './ItemCatalogTab.css?raw';
import { getGameToolsTabs, registerGameToolsTab } from './GameToolsRegistry.js';
import { loadAdventureControlBootstrap } from './AdventureControlService.js';
import monsterCatalogTab, { notifyMonsterSpawnConfig, notifyMonsterSpawnResult } from './MonsterCatalogTab.js';
import npcCatalogTab from './NpcCatalogTab.js';
import mapCatalogTab from './MapCatalogTab.js';
import characterMaintenanceTab from './CharacterMaintenanceTab.js';
import gameSettingsTab from './GameSettingsTab.js';
import itemCatalogTab from './ItemCatalogTab.js';

registerGameToolsTab(monsterCatalogTab);
registerGameToolsTab(npcCatalogTab);
registerGameToolsTab(mapCatalogTab);
registerGameToolsTab(itemCatalogTab);
registerGameToolsTab(characterMaintenanceTab);
registerGameToolsTab(gameSettingsTab);

const preferences = Preferences.get('GameTools', { tab: 'monsters' }, 1.0);
const GameTools = new GUIComponent('GameTools', cssText + itemCatalogCssText);
let cleanupTab;
let capabilities;

GameTools.render = () => htmlText;

GameTools.init = function init() {
	const root = this.getRoot();
	this.draggable('.titlebar');
	root.querySelector('.close').addEventListener('click', () => this.toggle());
	root.querySelector('.close').addEventListener('mousedown', event => event.stopImmediatePropagation());
	this._host.style.display = 'none';
	this.renderTabs();
};

GameTools.renderTabs = function renderTabs() {
	const root = this.getRoot();
	const tabs = getGameToolsTabs().filter(tab => !tab.capability || capabilities?.[tab.capability] === true);
	const selected = tabs.find(tab => tab.id === preferences.tab) || tabs[0];
	root.querySelector('.tab-list').innerHTML = tabs
		.map(
			tab =>
				`<button class="tab-button${tab.id === selected.id ? ' active' : ''}" type="button" role="tab" data-tab="${tab.id}">${tab.label}</button>`
		)
		.join('');
	root.querySelectorAll('.tab-button').forEach(button => {
		button.addEventListener('click', () => this.selectTab(button.dataset.tab));
	});
	this.mountTab(selected);
};

GameTools.selectTab = function selectTab(id) {
	const tab = getGameToolsTabs().find(candidate => candidate.id === id);
	if (!tab) return;
	preferences.tab = id;
	preferences.save();
	this.renderTabs();
};

GameTools.mountTab = function mountTab(tab) {
	cleanupTab?.();
	const content = this.getRoot().querySelector('.tab-content');
	content.innerHTML = '<div class="game-tools-tab"></div>';
	cleanupTab = tab.mount(content.firstElementChild, { capabilities });
};

GameTools.onAppend = function onAppend() {
	this.centerInViewport();
};

GameTools.centerInViewport = function centerInViewport() {
	const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
	const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
	const { width, height } = this._host.getBoundingClientRect();
	this._host.style.left = `${Math.max(0, (viewportWidth - width) / 2)}px`;
	this._host.style.top = `${Math.max(0, (viewportHeight - height) / 2)}px`;
};

GameTools.toggle = function toggle() {
	if (this.__active && this._host.style.display !== 'none') {
		this._host.style.display = 'none';
		return;
	}
	this.append();
	this._host.style.display = '';
	this.centerInViewport();
	void this.refreshCapabilities();
};

GameTools.refreshCapabilities = async function refreshCapabilities() {
	try {
		const nextCapabilities = await loadAdventureControlBootstrap();
		const changed = JSON.stringify(capabilities) !== JSON.stringify(nextCapabilities);
		capabilities = nextCapabilities;
		if (changed) this.renderTabs();
	} catch {
		capabilities = { characterMaintenanceAllowed: false, gameSettingsAllowed: false };
		this.renderTabs();
	}
};

GameTools.setMonsterSpawnConfig = function setMonsterSpawnConfig() {
	notifyMonsterSpawnConfig();
};

GameTools.onMonsterSpawnResult = function onMonsterSpawnResult(result) {
	notifyMonsterSpawnResult(result);
};

export default UIManager.addComponent(GameTools);
