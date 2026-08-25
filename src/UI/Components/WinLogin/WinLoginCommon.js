/**
 * WinLoginCommon.js
 *
 * Create a common login window for the game.
 *
 * @author AoShinHo
 */

import DB from 'DB/DBManager.js';
import Configs from 'Core/Configs.js';
import Preferences from 'Core/Preferences.js';
import KEYS from 'Controls/KeyEventHandler.js';
import UIManager from 'UI/UIManager.js';
import GUIComponent from 'UI/GUIComponent.js';
import 'UI/Elements/Elements.js';

export function createWinLogin({ name, htmlText, cssText }) {
	const Component = new GUIComponent(name, cssText);
	Component.render = () => htmlText;
	Component.needFocus = false;

	const _preferences = Preferences.get('WinLogin', { saveID: true, ID: '' }, 1.0);

	let _inputUsername;
	let _inputPassword;
	let _buttonSave;

	Component.init = function init() {
		this.draggable();

		const root = this.getRoot();
		// Save element references
		_inputUsername = root.querySelector('.user');
		_inputPassword = root.querySelector('.pass');
		_buttonSave = root.querySelector('.save');

		// Input handlers — clear on mousedown
		_inputUsername.addEventListener('mousedown', function (event) {
			this.focus();
			this.value = '';
			event.stopImmediatePropagation();
		});
		_inputPassword.addEventListener('mousedown', function (event) {
			this.focus();
			this.value = '';
			event.stopImmediatePropagation();
		});

		// Save button toggle
		_buttonSave.addEventListener('mousedown', event => {
			toggleSaveButton();
			event.stopImmediatePropagation();
		});

		// Connect / Signup / Exit
		root.querySelector('.signup').addEventListener('click', signup);
		root.querySelector('.connect').addEventListener('click', connect);
		root.querySelector('.exit').addEventListener('click', exit);
	};

	Component.onAppend = function onAppend() {
		_inputUsername.value = _preferences.saveID ? _preferences.ID : '';
		_inputPassword.value = '';

		updateSaveButton();

		if (_preferences.ID.length) {
			_inputPassword.focus();
		} else {
			_inputUsername.focus();
		}

		Component.placeOnTop();
	};

	Component.onKeyDown = function onKeyDown(event) {
		if (this._host.style.display === 'none') return true;

		switch (event.which) {
			case KEYS.ENTER:
				connect();
				event.stopImmediatePropagation();
				return false;
			case KEYS.ESCAPE:
				exit();
				event.stopImmediatePropagation();
				return false;
			case KEYS.TAB: {
				const activeEl = this._shadow.activeElement;
				const target = activeEl === _inputUsername ? _inputPassword : _inputUsername;
				target.focus();
				target.select();
				event.stopImmediatePropagation();
				return false;
			}
		}
		return true;
	};

	function toggleSaveButton() {
		_preferences.saveID = !_preferences.saveID;
		updateSaveButton();
	}

	function updateSaveButton() {
		_buttonSave.classList.toggle('is-checked', _preferences.saveID);
		_buttonSave.setAttribute('aria-checked', String(_preferences.saveID));
	}

	function exit() {
		Component.onExitRequest();
		return false;
	}

	function connect() {
		const user = _inputUsername.value;
		const pass = _inputPassword.value;
		if (_preferences.saveID) {
			_preferences.saveID = true;
			_preferences.ID = user;
		} else {
			_preferences.saveID = false;
			_preferences.ID = '';
		}
		_preferences.save();
		Component.onConnectionRequest(user, pass);
		return false;
	}

	function signup() {
		const url = Configs.get('registrationweb');
		if (url) {
			UIManager.showPromptBox(
				DB.getMessage(662),
				'ok',
				'cancel',
				() => {
					window.open(url);
				},
				null
			);
		} else {
			UIManager.showPromptBox(
				'当前支持快速注册：在新账号名末尾添加 _M（男）或 _F（女），输入要设置的密码后登录。\n例如：HappyRO_M',
				'ok',
				'cancel',
				null,
				null
			);
		}
	}

	Component.onConnectionRequest = function onConnectionRequest() {};
	Component.onExitRequest = function onExitRequest() {};

	return UIManager.addComponent(Component);
}
