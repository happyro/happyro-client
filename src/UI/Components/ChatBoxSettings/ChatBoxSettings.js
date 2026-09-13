/**
 * UI/Components/ChatBoxSettings/ChatBoxSettings.js
 *
 * Chat Box Settings
 *
 * This file is part of ROBrowser, (http://www.robrowser.com/).
 */

import DB from 'DB/DBManager.js';
import Preferences from 'Core/Preferences.js';
import Renderer from 'Renderer/Renderer.js';
import Client from 'Core/Client.js';
import Mouse from 'Controls/MouseEventHandler.js';
import UIManager from 'UI/UIManager.js';
import GUIComponent from 'UI/GUIComponent.js';
import htmlText from './ChatBoxSettings.html?raw';
import cssText from './ChatBoxSettings.css?raw';

/**
 * Create Component
 */
const ChatBoxSettings = new GUIComponent('ChatBoxSettings', cssText);

/**
 * Render HTML
 */
ChatBoxSettings.render = () => htmlText;

/**
 * @var {boolean} is ChatBoxSettings open ? (Temporary fix)
 */
ChatBoxSettings.isOpen = false;

ChatBoxSettings.tabOption = [];

ChatBoxSettings.activeTab = 0;

/**
 * @var {Preference} structure to save
 */
const _preferences = Preferences.get(
	'ChatBoxSettings',
	{
		x: 480,
		y: 200,
		width: 7,
		height: 8
	},
	1.0
);

/**
 * Initialize UI
 */
ChatBoxSettings.init = function init() {
	const root = this.getRoot();

	const extendBtn = root.querySelector('.extend');
	if (extendBtn) {
		extendBtn.addEventListener('mousedown', onResize);
	}

	const closeBtn = root.querySelector('.close');
	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			this._host.style.display = 'none';
		});
	}

	// Event delegation for option buttons
	const listOption = root.querySelector('.listoption');
	if (listOption) {
		listOption.addEventListener('click', event => {
			const btn = event.target.closest('button');
			if (btn) {
				onClickOption(btn);
			}
		});
	}

	root.querySelector('.enable-all').addEventListener('click', () => {
		const buttons = root.querySelectorAll('.listoption button[data-id]');
		this.tabOption[this.activeTab] = [...buttons].map(button => Number(button.dataset.id));
		buttons.forEach(button => {
			button.classList.add('on');
			updateOptionImage(button);
		});
	});
	this.draggable('.titlebar');
};

function updateOptionImage(button) {
	const enabled = button.classList.contains('on');
	Client.loadFile(DB.INTERFACE_PATH + 'basic_interface/grp_' + (enabled ? 'online' : 'offline') + '.bmp', data => {
		if (button.classList.contains('on') === enabled) button.style.backgroundImage = `url(${data})`;
	});
}

/**
 * Once in HTML
 */
ChatBoxSettings.onAppend = function onAppend() {
	// Call resize first while visible so scrollHeight works and host height is updated
	resize(_preferences.height);

	const rect = this._host.getBoundingClientRect();
	this._host.style.top = Math.min(Math.max(0, _preferences.y), Renderer.height - rect.height) + 'px';
	this._host.style.left = Math.min(Math.max(0, _preferences.x), Renderer.width - rect.width) + 'px';
	this._host.style.display = 'none';
};

/**
 * Key Event Handler
 */
ChatBoxSettings.onKeyDown = function onKeyDown(event) {};

/**
 * Handle option button click
 */
function onClickOption(btn) {
	const dataId = parseInt(btn.getAttribute('data-id'), 10);
	let isOn = btn.classList.contains('on');

	if (isOn) {
		btn.classList.remove('on');
		isOn = false;
	} else {
		btn.classList.add('on');
		isOn = true;
	}

	updateOptionImage(btn);

	if (!isNaN(dataId)) {
		const idsIndex = ChatBoxSettings.tabOption[ChatBoxSettings.activeTab].indexOf(dataId);

		if (idsIndex > -1) {
			ChatBoxSettings.tabOption[ChatBoxSettings.activeTab].splice(idsIndex, 1);
		} else {
			ChatBoxSettings.tabOption[ChatBoxSettings.activeTab].push(dataId);
		}
	}
}

/**
 * Resize ChatBoxSettings
 */
function onResize() {
	const rect = ChatBoxSettings._host.getBoundingClientRect();
	const top = rect.top;
	let lastHeight = 0;

	function resizeProcess() {
		const extraY = 31 + 19 - 30;
		let h = Math.floor((Mouse.screen.y - top - extraY) / 32);
		h = Math.min(Math.max(h, 8), 12);
		if (h === lastHeight) {
			return;
		}
		resize(h);
		lastHeight = h;
	}

	const interval = setInterval(resizeProcess, 30);

	const onMouseUp = event => {
		if (event.which === 1) {
			clearInterval(interval);
			window.removeEventListener('mouseup', onMouseUp);
		}
	};
	window.addEventListener('mouseup', onMouseUp);
}

ChatBoxSettings.toggle = function toggle() {
	if (this._host.style.display === 'none') {
		this.ui.show();
	} else {
		this.ui.hide();
	}
};

ChatBoxSettings.updateTab = function updateTab(tabID, tabName) {
	const root = this.getRoot();
	const optList = ChatBoxSettings.tabOption[tabID];
	const buttons = root.querySelectorAll('.content .listoption button');

	this.activeTab = tabID;

	root.querySelector('.tabname').textContent = tabName;

	buttons.forEach(btn => {
		const id = parseInt(btn.getAttribute('data-id'), 10);
		btn.classList.toggle('on', Boolean(optList?.includes(id)));
		updateOptionImage(btn);
	});
};

/**
 * Extend window size
 */
function resize(height) {
	height = Math.min(Math.max(height, 8), 12);
	const root = ChatBoxSettings.getRoot();
	const content = root.querySelector('.content');
	if (content) {
		content.style.height = height * 32 + 'px';
	}
	const list = root.querySelector('.listoption');
	if (list) {
		list.style.height = height * 32 - 31 + 'px';
	}
	const inner = root.querySelector('#ChatBoxSettings');
	if (inner) {
		ChatBoxSettings._host.style.height = inner.offsetHeight + 'px';
	}
	_preferences.height = height;
	_preferences.save();
}

ChatBoxSettings.onRemove = function onRemove() {
	_preferences.y = parseInt(this._host.style.top, 10) || 0;
	_preferences.x = parseInt(this._host.style.left, 10) || 0;
	_preferences.save();
};

ChatBoxSettings.mouseMode = GUIComponent.MouseMode.STOP;

/**
 * Create component and export it
 */
export default UIManager.addComponent(ChatBoxSettings);
