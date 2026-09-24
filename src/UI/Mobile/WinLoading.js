import MobileGUIComponent from 'UI/MobileGUIComponent.js';
import { withMobileShell } from './Shell.js';
import shellCSS from './Shell.css?raw';
import css from './Loading.css?raw';

const loading = new MobileGUIComponent('WinLoading', css + shellCSS);
loading.render = () => `<div class="mobile-loading" role="status" aria-live="polite">
	<div class="loading-card"><img class="loading-poring" src="./ro-poring-1.webp" alt="" />
	<div class="loading-spinner" aria-hidden="true"></div>
	<p class="loading-title">正在连接服务器…</p></div>
</div>`;
export default withMobileShell(loading);
