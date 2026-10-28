import Client from 'Core/Client.js';
import Platform from 'UI/Platform.js';
import desktopTheme from '../DesktopLightTheme.css?raw';
import desktopHeader from '../DesktopWindowHeader.css?raw';
import desktopCSS from './GuildStorageLogDesktop.css?raw';
import GUIComponent from 'UI/GUIComponent.js';
import UIManager from 'UI/UIManager.js';
import DB from 'DB/DBManager.js';
import { acquireInputFreeze, releaseInputFreeze } from 'UI/InputFreeze.js';
import css from './GuildStorageLog.css?raw';
import menuLayout from 'UI/Mobile/game/MenuLayout.css?raw';
import menuTheme from 'UI/Mobile/game/MenuTheme.css?raw';
import menuPanes from 'UI/Mobile/game/MenuPaneLayout.css?raw';
import menuButtons from 'UI/Mobile/game/MenuButtonSizing.css?raw';
import mobileCSS from './GuildStorageLogMobile.css?raw';
import { updateMenuLayout } from 'UI/Mobile/game/MenuLayout.js';

const view = new GUIComponent(
	'GuildStorageLog',
	css +
		(Platform.isMobile
			? menuLayout + menuTheme + menuPanes + menuButtons + mobileCSS
			: desktopTheme + desktopHeader + desktopCSS)
);
view.needFocus = false;
view.nativeScrolling = true;
let entries = [],
	result = 2,
	page = 0;
const pageSize = 20;
view.render = () => {
	const mobile = Platform.isMobile;
	return `<div class="${mobile ? 'mobile-menu-viewport' : 'desktop-viewport'}">
 <section class="${mobile ? 'panel mobile-menu-window' : ''}" data-view="guild-storage-log" data-layout="${mobile ? 'mobile' : 'desktop'}" tabindex="-1" role="dialog" aria-modal="true" aria-label="公会仓库记录">
 <header class="${mobile ? '' : 'desktop-window-header'}"><div class="heading"><h2 class="${mobile ? '' : 'desktop-window-title'}">公会仓库记录</h2><span class="record-count"></span></div><div class="panel-navigation"><button data-close class="${mobile ? '' : 'desktop-window-close'}" aria-label="关闭">${mobile ? '关闭' : ''}</button></div></header>
 <div class="panel-body"><div class="menu-scroll-frame"><div class="records menu-scroll-area" tabindex="0" aria-label="仓库记录列表"></div></div></div>
 <footer class="menu-footer"><nav data-menu-pagination aria-label="记录分页"><button data-previous aria-label="上一页">${mobile ? '‹' : '上一页'}</button><span data-page aria-live="polite"></span><button data-next aria-label="下一页">${mobile ? '›' : '下一页'}</button></nav></footer>
 </section></div>`;
};
function updateLayout() {
	if (Platform.isMobile) updateMenuLayout(view._host, window.innerWidth, window.innerHeight);
}
function renderPage() {
	const root = view.getRoot(),
		region = root.querySelector('.records');
	region.replaceChildren();
	const pages = Math.max(1, Math.ceil(entries.length / pageSize));
	root.querySelector('.record-count').textContent = result === 3 ? '' : `（最近 ${entries.length} 条）`;
	if (!entries.length) {
		const message = document.createElement('p');
		message.className = 'summary';
		message.setAttribute('role', 'status');
		message.textContent = result === 3 ? '加载失败' : '暂无记录';
		region.append(message);
	}
	for (const entry of entries.slice(page * pageSize, (page + 1) * pageSize)) {
		const row = document.createElement('article');
		const label = document.createElement('div');
		label.className = 'record-item';
		const icon = document.createElement('span');
		icon.className = 'item-icon';
		icon.setAttribute('aria-hidden', 'true');
		const item = document.createElement('strong');
		item.textContent = `${entry.refine > 0 ? `+${entry.refine} ` : ''}${DB.getItemName({ ITID: entry.itemId, IsIdentified: entry.IsIdentified })} × ${entry.amount}`;
		const detail = document.createElement('span');
		detail.textContent = `${entry.name} · ${entry.action ? '存入' : '取出'}`;
		const time = document.createElement('time');
		time.textContent = entry.time;
		label.append(icon, item);
		row.append(label, detail, time);
		region.append(row);
		const info = DB.getItemInfo(entry.itemId);
		const resource = entry.IsIdentified ? info.identifiedResourceName : info.unidentifiedResourceName;
		if (resource) {
			Client.loadFile(`${DB.INTERFACE_PATH}item/${resource}.bmp`, url => {
				// Bind to this row, never a reused page index after asynchronous loading.
				if (region.contains(icon)) icon.style.backgroundImage = `url("${url}")`;
			});
		}
	}
	region.scrollTop = 0;
	root.querySelector('[data-page]').textContent = `${page + 1} / ${pages}`;
	root.querySelector('[data-previous]').disabled = page === 0;
	root.querySelector('[data-next]').disabled = page + 1 >= pages;
}
view.init = function () {
	const root = this.getRoot();
	root.querySelector('[data-close]').onclick = () => this.remove();
	root.querySelector('[data-previous]').onclick = () => {
		if (page > 0) {
			page--;
			renderPage();
		}
	};
	root.querySelector('[data-next]').onclick = () => {
		if ((page + 1) * pageSize < entries.length) {
			page++;
			renderPage();
		}
	};
};
view.onAppend = function () {
	acquireInputFreeze(this);
	this.placeOnTop();
	updateLayout();
	window.addEventListener('resize', updateLayout);
	renderPage();
	this.getRoot().querySelector('section').focus();
};
view.onRemove = function () {
	window.removeEventListener('resize', updateLayout);
	releaseInputFreeze(this);
	entries = [];
};
view.onKeyDown = function (event) {
	if (event.key === 'Escape' || event.which === 27) {
		this.remove();
		return false;
	}
	return true;
};
export function showGuildStorageLog(packet) {
	entries = packet.result === 1 ? packet.items : [];
	result = packet.result;
	page = 0;
	if (view.__active) renderPage();
	else view.append();
}
export default UIManager.addComponent(view);
