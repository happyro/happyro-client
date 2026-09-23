import Platform from 'UI/Platform.js';
import MobileWinLoading from 'UI/Mobile/WinLoading.js';
import WinPopup from 'UI/Components/WinPopup/WinPopup.js';
import UIManager from 'UI/UIManager.js';
import Renderer from 'Renderer/Renderer.js';
import DB from 'DB/DBManager.js';

const loading = Platform.isMobile ? MobileWinLoading : WinPopup.clone('WinLoading');
if (!Platform.isMobile) {
	loading.init = function () {
		Object.assign(this._host.style, {
			top: (Renderer.height - 120) / 1.5 + 'px',
			left: (Renderer.width - 280) / 2.0 + 'px'
		});
		this._shadow.querySelector('.text').textContent = DB.getMessage(121);
	};
}
UIManager.addComponent(loading);
export default loading;
