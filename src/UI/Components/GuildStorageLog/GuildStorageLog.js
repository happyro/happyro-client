import GUIComponent from 'UI/GUIComponent.js';
import DB from 'DB/DBManager.js';
import { acquireInputFreeze, releaseInputFreeze } from 'UI/InputFreeze.js';
import css from './GuildStorageLog.css?raw';

const view = new GUIComponent('GuildStorageLog', css);
let entries = [],
	result = 2,
	page = 0;
const pageSize = 20;
view.render = () =>
	`<section role="dialog" aria-modal="true" aria-label="公会仓库记录"><header><h2>公会仓库记录</h2><button data-close>关闭</button></header><p class="summary"></p><div class="records" tabindex="0"></div><footer><button data-previous>上一页</button><span data-page></span><button data-next>下一页</button></footer></section>`;
function renderPage() {
	const root = view.getRoot(),
		region = root.querySelector('.records');
	region.replaceChildren();
	const pages = Math.max(1, Math.ceil(entries.length / pageSize));
	root.querySelector('.summary').textContent =
		result === 3
			? '仓库记录加载失败，请重新与仓库管理员对话'
			: entries.length
				? `最近 ${entries.length} 条记录`
				: '暂无公会仓库记录';
	for (const entry of entries.slice(page * pageSize, (page + 1) * pageSize)) {
		const row = document.createElement('article');
		const item = document.createElement('strong');
		item.textContent = `${entry.refine > 0 ? `+${entry.refine} ` : ''}${DB.getItemName({ ITID: entry.itemId, IsIdentified: entry.IsIdentified })} × ${entry.amount}`;
		const detail = document.createElement('span');
		detail.textContent = `${entry.name} · ${entry.action ? '存入' : '取出'}`;
		const time = document.createElement('time');
		time.textContent = entry.time;
		row.append(item, detail, time);
		region.append(row);
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
	renderPage();
	this.getRoot().querySelector('[data-close]').focus();
};
view.onRemove = function () {
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
export default view;
