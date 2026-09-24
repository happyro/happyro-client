/** Mobile backgrounds never fetch desktop bitmaps or draw the desktop progress canvas. */
import css from './Loading.css?raw';

let host;
let root;

function mount(title) {
	if (!host) {
		host = document.createElement('div');
		host.id = 'MobileBackground';
		root = host.attachShadow({ mode: 'open' });
		root.innerHTML = `<style>${css}</style><div class="mobile-loading"><section class="loading-card">
			<img class="loading-poring" src="./ro-poring-1.webp" alt="" /><h1 class="loading-title"></h1>
			<progress max="100" value="0"></progress><p class="loading-percent" aria-hidden="true">0%</p>
		</section></div>`;
		for (const type of ['touchstart', 'touchmove', 'touchend']) {
			host.addEventListener(type, event => event.stopPropagation(), { passive: true });
		}
	}
	document.body.appendChild(host);
	root.querySelector('.loading-card').hidden = !title;
	root.querySelector('.loading-title').textContent = title || '';
	root.querySelector('progress').setAttribute('aria-label', title || '加载进度');
}

export default class MobileBackground {
	static init() {}
	static resize() {} // Fixed CSS bounds follow rotation without changing progress.
	static setImage(_filename, callback) {
		mount('正在加载资源');
		host.style.zIndex = '1';
		this.setPercent(0);
		callback?.();
	}
	static setLoginBackground(callback) {
		mount(null);
		host.style.zIndex = '1';
		callback?.();
	}
	static setLoading(callback) {
		mount('正在加载地图');
		host.style.zIndex = '999';
		this.setPercent(0);
		callback?.();
	}
	static setPercent(value) {
		if (!host?.isConnected) return;
		const percent = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.floor(value))) : 0;
		if (root.querySelector('.loading-card').hidden) {
			root.querySelector('.loading-card').hidden = false;
			root.querySelector('.loading-title').textContent = '正在加载资源';
			root.querySelector('progress').setAttribute('aria-label', '正在加载资源');
		}
		root.querySelector('progress').value = percent;
		root.querySelector('.loading-percent').textContent = `${percent}%`;
	}
	static remove(callback) {
		host?.remove();
		callback?.();
	}
}
