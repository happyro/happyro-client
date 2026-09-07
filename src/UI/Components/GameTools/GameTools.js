import GUIComponent from 'UI/GUIComponent.js';
import UIManager from 'UI/UIManager.js';
import Preferences from 'Core/Preferences.js';
import htmlText from './GameTools.html?raw';
import cssText from './GameTools.css?raw';
import { getGameToolsTabs, registerGameToolsTab } from './GameToolsRegistry.js';
import monsterCatalogTab, { notifyMonsterSpawnConfig, notifyMonsterSpawnResult } from './MonsterCatalogTab.js';

registerGameToolsTab(monsterCatalogTab);

const preferences = Preferences.get('GameTools', { x: 250, y: 90, tab: 'monsters' }, 1.0);
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
	this._host.style.left = `${preferences.x}px`;
	this._host.style.top = `${preferences.y}px`;
	this._fixPositionOverflow();
};

GameTools.onRemove = function onRemove() {
	preferences.x = Number.parseInt(this._host.style.left, 10);
	preferences.y = Number.parseInt(this._host.style.top, 10);
	preferences.save();
};

GameTools.toggle = function toggle() {
	if (this.__active && this._host.style.display !== 'none') {
		this._host.style.display = 'none';
		return;
	}
	this.append();
	this._host.style.display = '';
	this._fixPositionOverflow();
};

GameTools.setMonsterSpawnConfig = function setMonsterSpawnConfig() {
	notifyMonsterSpawnConfig();
};

GameTools.onMonsterSpawnResult = function onMonsterSpawnResult(result) {
	notifyMonsterSpawnResult(result);
};

export default UIManager.addComponent(GameTools);
