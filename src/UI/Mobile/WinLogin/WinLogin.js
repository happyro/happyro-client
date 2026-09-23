/**
 * UI/Mobile/WinLogin/WinLogin.js
 *
 * Mobile login window.
 * Exposes the same public API as WinLoginCommon:
 *   onConnectionRequest(user, pass)
 *   onExitRequest()
 */

import Configs from 'Core/Configs.js';
import Preferences from 'Core/Preferences.js';
import UIManager from 'UI/UIManager.js';
import GUIComponent from 'UI/GUIComponent.js';
import MobileGUIComponent from 'UI/MobileGUIComponent.js';
import { normalizeRememberedAccount } from 'UI/Components/WinLogin/RememberedAccount.js';
import htmlText from './WinLogin.html?raw';
import cssText from './WinLogin.css?raw';
import shellCSS from '../Shell.css?raw';
import { withMobileShell } from '../Shell.js';

const MobileWinLogin = new MobileGUIComponent('MobileWinLogin', cssText + shellCSS);

MobileWinLogin.render = () => htmlText;

// FREEZE mode: blocks all game touch/mouse input while login screen is active,
// which is required for the soft keyboard to appear on mobile.
MobileWinLogin.mouseMode = GUIComponent.MouseMode.FREEZE;

const _preferences = Preferences.get('WinLogin', { saveID: true, ID: '' }, 1.0);

let _inputUser;
let _inputPass;
let _btnSave;

MobileWinLogin.init = function init() {
	const root = this._shadow;

	_inputUser = root.getElementById('m-login-user');
	_inputPass = root.getElementById('m-login-pass');
	_btnSave   = root.querySelector('.m-login__save');

	_btnSave.addEventListener('click', _toggleSave);
	root.querySelector('.m-login__connect').addEventListener('click', _connect);
	root.querySelector('.m-login__signup').addEventListener('click', _signup);
	root.querySelector('.m-login__exit').addEventListener('click', _exit);

	_inputPass.addEventListener('keydown', e => {
		if (e.key === 'Enter') _connect();
	});
};

MobileWinLogin.onAppend = function onAppend() {
	_inputUser.value = _preferences.saveID ? normalizeRememberedAccount(_preferences.ID) : '';
	_inputPass.value = '';
	_updateSave();

};

function _toggleSave() {
	_preferences.saveID = !_preferences.saveID;
	_updateSave();
}

function _updateSave() {
	_btnSave.setAttribute('aria-checked', String(_preferences.saveID));
}

function _connect() {
	const user = _inputUser.value.trim();
	const pass = _inputPass.value;

	if (_preferences.saveID) {
		_preferences.ID = normalizeRememberedAccount(user);
	} else {
		_preferences.ID = '';
	}
	_preferences.save();

	_inputUser.blur();
	_inputPass.blur();
	MobileWinLogin.onConnectionRequest(user, pass);
}

function _signup() {
	const url = Configs.get('registrationweb');
	if (url) {
		UIManager.showPromptBox(
			'前往注册页面？',
			'ok',
			'cancel',
			() => window.open(url),
			null
		);
	} else {
		UIManager.showPromptBox(
			'自动注册：\n1. 在账号名末尾添加 _M（男）或 _F（女）\n2. 输入要设置的密码后登录\n3. 例如：happyro_M',
			'ok',
			'cancel',
			null,
			null,
			true
		);
	}
}

function _exit() {
	MobileWinLogin.onExitRequest();
}

MobileWinLogin.onConnectionRequest = function onConnectionRequest() {};
MobileWinLogin.onExitRequest = function onExitRequest() {};

UIManager.addComponent(MobileWinLogin);

export default withMobileShell(MobileWinLogin);
