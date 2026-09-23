/**
 * UIVersionManager.js
 *
 * Manage Component
 *
 * This file is part of ROBrowser, (http://www.robrowser.com/).
 *
 * @author Vincent Thibault
 */

import Configs from 'Core/Configs.js';
import PacketVerManager from 'Network/PacketVerManager.js';
import Platform from 'UI/Platform.js';

const _UIAliases = {};

/**
 * Platform overrides via UIManager.getComponent() path.
 * { publicName -> { desktop: string, mobile: string } }
 */
const _platformMap = {};

/**
 * Mobile component overrides via UIController.getUI() path.
 * { publicName -> GUIComponent }
 * Populated by registerMobileComponent() during bootstrap.
 */
const _mobileComponents = {};
class UIVersionManager {
	static getUIAlias(name) {
		// Platform override takes priority over version aliases.
		if (name in _platformMap) {
			const map = _platformMap[name];
			return Platform.isMobile ? map.mobile : map.desktop;
		}
		return name in _UIAliases ? _UIAliases[name] : false;
	}

	/**
	 * Register a platform-specific component pair.
	 * Call this during bootstrap before any component is accessed.
	 *
	 * @param {string} publicName  - The name callers use (e.g. 'Inventory')
	 * @param {{ desktop: string, mobile: string }} map
	 *   desktop: component name used on desktop (often the same as publicName)
	 *   mobile:  component name used on mobile/tablet (e.g. 'MobileInventory')
	 *            If omitted, falls back to the desktop name.
	 */
	static registerPlatform(publicName, { desktop, mobile }) {
		_platformMap[publicName] = { desktop, mobile: mobile ?? desktop };
	}

	static selectUIVersion(publicName, versionInfo) {
		let SelectedUI = versionInfo.default;
		let _maxDate = 0;

		function getUIbyGameMode(gameMode) {
			if (typeof gameMode === 'object' && Object.keys(gameMode).length > 0) {
				for (const [keydate, UI] of Object.entries(gameMode)) {
					const dateNum = parseInt(keydate);
					if (PacketVerManager.value >= dateNum && dateNum > _maxDate) {
						SelectedUI = UI;
						_maxDate = dateNum;
					}
				}
			}
		}

		// Common UI
		getUIbyGameMode(versionInfo.common);

		if (Configs.get('renewal')) {
			// Renewal only UI
			getUIbyGameMode(versionInfo.re);
		} else {
			// Classic only UI
			getUIbyGameMode(versionInfo.prere);
		}

		// Store selected UI name
		_UIAliases[publicName] = SelectedUI.name;
		console.log('%c[UIVersion] ' + publicName + ': ', 'color:#007000', SelectedUI.name);
		return SelectedUI;
	}

	/**
	 * Register a mobile component for the UIController (.getUI()) path.
	 * Call during mobile bootstrap before selectUIVersion() is invoked.
	 *
	 * @param {string} publicName - matches the name used in WinLogin.js / CharSelect.js etc.
	 * @param {GUIComponent} component - the mobile component instance
	 */
	static registerMobileComponent(publicName, component) {
		_mobileComponents[publicName] = component;
	}

	static getUIController(publicName, versionInfo) {
		let _selectedUI;

		const UIController = {};

		UIController.selectUIVersion = function () {
			_selectedUI = UIVersionManager.selectUIVersion(publicName, versionInfo);
			if (Platform.isMobile && publicName in _mobileComponents) {
				_selectedUI = _mobileComponents[publicName];
				_UIAliases[publicName] = _selectedUI.name;
				console.log('%c[UIVersion] ' + publicName + ' (mobile): ', 'color:#007000', _selectedUI.name);
			}
		};

		UIController.selectUIVersionWithJob = function (job) {
			_selectedUI = versionInfo.job[job] || versionInfo.job.default;
			_UIAliases[publicName] = _selectedUI.name;
			console.log('[UIVersion] ' + publicName + ': ', _selectedUI.name);
		};

		UIController.selectSpecificUIVersion = function (version) {
			_selectedUI = versionInfo.common[version] || versionInfo.default;
			_UIAliases[publicName] = _selectedUI.name;
			console.log('[UIVersion] ' + publicName + ': ', _selectedUI.name);
		};

		UIController.getUI = function () {
			return _selectedUI;
		};

		return UIController;
	}

	/// DEPRECATED
	/// WILL BE REMOVED AFTER REFACTORING
	static getEquipmentVersion() {
		if (Configs.get('clientVersionMode') === 'PacketVer') {
			if (PacketVerManager.value >= 20090601) {
				return 1;
			} else {
				return 0;
			}
		}
		if (Configs.get('clientVersionMode') === 'PreRenewal') {
			return 0;
		}
		return 1;
	}
	static getWinStatsVersion() {
		if (Configs.get('clientVersionMode') === 'PacketVer') {
			if (PacketVerManager.value >= 20090601) {
				return 1;
			} else {
				return 0;
			}
		}
		if (Configs.get('clientVersionMode') === 'PreRenewal') {
			return 0;
		}
		return 1;
	}
	static getInventoryVersion() {
		if (Configs.get('clientVersionMode') === 'PacketVer') {
			if (PacketVerManager.value >= 20090601) {
				return 1;
			} else {
				return 0;
			}
		}
		if (Configs.get('clientVersionMode') === 'PreRenewal') {
			return 0;
		}
		return 1;
	}
}
export default UIVersionManager;
