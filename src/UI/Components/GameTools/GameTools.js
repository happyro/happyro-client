import GUIComponent from 'UI/GUIComponent.js';
import UIManager from 'UI/UIManager.js';
import Preferences from 'Core/Preferences.js';
import htmlText from './GameTools.html?raw';
import cssText from './GameTools.css?raw';
import { getGameToolsTabs, registerGameToolsTab } from './GameToolsRegistry.js';
import monsterCatalogTab, { notifyMonsterSpawnConfig, notifyMonsterSpawnResult } from './MonsterCatalogTab.js';
import npcCatalogTab from './NpcCatalogTab.js';
import mapCatalogTab from './MapCatalogTab.js';

registerGameToolsTab(monsterCatalogTab);
registerGameToolsTab(npcCatalogTab);
registerGameToolsTab(mapCatalogTab);

const preferences = Preferences.get('GameTools', { tab: 'monsters' }, 1.0);
const GameTools = new GUIComponent('GameTools', cssText);
let cleanupTab;

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
	const tabs = getGameToolsTabs();
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
	cleanupTab = tab.mount(content.firstElementChild);
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
};

GameTools.setMonsterSpawnConfig = function setMonsterSpawnConfig() {
	notifyMonsterSpawnConfig();
};

GameTools.onMonsterSpawnResult = function onMonsterSpawnResult(result) {
	notifyMonsterSpawnResult(result);
};

export default UIManager.addComponent(GameTools);
