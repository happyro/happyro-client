import { pickupCategories } from './PickupSettings.js';
import { searchAdventureItems } from 'UI/Components/GameTools/AdventureControlService.js';

/** Edits the settings draft; saving is owned by the enclosing settings panel. */
export function createPickupSettingsPanel(section, draft) {
	section.classList.add('pickup-section');
	const label = (text, input) => {
		const row = document.createElement('label');
		row.className = 'settings-field';
		const caption = document.createElement('span');
		caption.textContent = text;
		row.append(caption, input);
		return row;
	};
	const enabled = document.createElement('input');
	enabled.type = 'checkbox';
	enabled.checked = draft.enabled;
	enabled.dataset.pickup = 'enabled';
	section.append(label('自动拾取', enabled));
	const controls = document.createElement('fieldset');
	controls.className = 'pickup-controls';
	controls.disabled = !draft.enabled;
	enabled.oninput = () => {
		draft.enabled = enabled.checked;
		controls.disabled = !draft.enabled;
	};
	const range = document.createElement('input');
	range.type = 'number';
	range.min = 1;
	range.max = 15;
	range.step = 1;
	range.value = draft.range;
	range.dataset.pickup = 'range';
	range.oninput = () => {
		draft.range = Number(range.value);
	};
	controls.append(label('拾取范围（格）', range));
	const batchSeconds = document.createElement('input');
	batchSeconds.type = 'number';
	batchSeconds.min = 1;
	batchSeconds.max = 30;
	batchSeconds.step = 1;
	batchSeconds.value = draft.batchSeconds;
	batchSeconds.dataset.pickup = 'batchSeconds';
	batchSeconds.oninput = () => {
		draft.batchSeconds = Number(batchSeconds.value);
	};
	controls.append(label('每轮拾取最长时间（秒）', batchSeconds));
	const batchHelp = document.createElement('p');
	batchHelp.className = 'pickup-note';
	batchHelp.textContent = '自动战斗时，打完当前目标再拾取本轮物品；达到时限后重新找怪，没有怪物则继续拾取。';
	controls.append(batchHelp);
	const categories = document.createElement('div');
	categories.className = 'pickup-categories';
	categories.setAttribute('role', 'group');
	categories.setAttribute('aria-label', '物品分类');
	for (const [id, text] of pickupCategories) {
		const input = document.createElement('input');
		input.type = 'checkbox';
		input.checked = draft.categories.includes(id);
		input.dataset.category = id;
		input.oninput = () => {
			draft.categories = pickupCategories
				.map(([key]) => key)
				.filter(key => categories.querySelector(`[data-category="${key}"]`).checked);
		};
		categories.append(label(text, input));
	}
	controls.append(categories);
	const heading = document.createElement('h4');
	heading.textContent = '排除物品';
	controls.append(heading);
	const columns = document.createElement('div');
	columns.className = 'pickup-columns';
	const searchColumn = document.createElement('section');
	searchColumn.className = 'pickup-column pickup-search-column';
	searchColumn.setAttribute('aria-label', '搜索物品');
	const excludedColumn = document.createElement('section');
	excludedColumn.className = 'pickup-column pickup-excluded-column';
	excludedColumn.setAttribute('aria-label', '已排除物品');
	const searchTitle = document.createElement('h5');
	searchTitle.textContent = '搜索物品';
	const excludedTitle = document.createElement('h5');
	excludedTitle.textContent = '已排除物品';
	searchColumn.append(searchTitle);
	excludedColumn.append(excludedTitle);
	columns.append(searchColumn, excludedColumn);
	controls.append(columns);
	const excluded = document.createElement('div');
	excluded.className = 'pickup-excluded';
	function button(text, action) {
		const b = document.createElement('button');
		b.type = 'button';
		b.textContent = text;
		b.onclick = action;
		return b;
	}
	function renderExcluded() {
		excluded.replaceChildren();
		excludedTitle.textContent = `已排除物品（${draft.excluded.length}）`;
		for (const item of draft.excluded) {
			const row = document.createElement('div');
			row.className = 'pickup-item';
			const name = document.createElement('span');
			name.textContent = `${item.name} · ${item.id}`;
			row.append(
				name,
				button('移除', () => {
					draft.excluded = draft.excluded.filter(entry => entry.id !== item.id);
					renderExcluded();
				})
			);
			excluded.append(row);
		}
		if (!draft.excluded.length) excluded.textContent = '暂无排除物品';
		section.querySelectorAll('[data-exclude-id]').forEach(control => {
			control.disabled = draft.excluded.some(item => item.id === Number(control.dataset.excludeId));
		});
	}
	renderExcluded();
	excludedColumn.append(excluded);
	const searchRow = document.createElement('div');
	searchRow.className = 'pickup-search';
	const input = document.createElement('input');
	input.type = 'search';
	input.placeholder = '输入物品名称或 ID';
	input.setAttribute('aria-label', '搜索排除物品');
	const results = document.createElement('div');
	results.className = 'pickup-results';
	results.setAttribute('aria-live', 'polite');
	results.textContent = '输入名称或 ID 搜索，将物品加入右侧排除列表。';
	let requestId = 0;
	async function search(page = 1) {
		const query = input.value.trim(),
			token = ++requestId;
		results.replaceChildren();
		if (!query) return;
		results.textContent = '搜索中…';
		try {
			const response = await searchAdventureItems({ query, page, perPage: 20 });
			if (token !== requestId || !section.isConnected) return;
			results.replaceChildren();
			for (const item of response.data) {
				const name = item.names?.['zh-CN'] || item.AegisName;
				const row = document.createElement('div');
				row.className = 'pickup-item';
				const title = document.createElement('span');
				title.textContent = `${name} · ${item.Id}`;
				const add = button('排除', () => {
					if (!draft.excluded.some(entry => entry.id === item.Id)) draft.excluded.push({ id: item.Id, name });
					renderExcluded();
					add.disabled = true;
				});
				add.dataset.excludeId = String(item.Id);
				add.disabled = draft.excluded.some(entry => entry.id === item.Id);
				row.append(title, add);
				results.append(row);
			}
			if (!response.data.length) results.textContent = '没有找到物品';
			if (page > 1) results.append(button('上一页', () => search(page - 1)));
			if (response.total > page * 20) results.append(button('下一页', () => search(page + 1)));
		} catch {
			if (token === requestId) results.textContent = '搜索失败，请重试';
		}
	}
	input.oninput = () => {
		requestId++;
		results.replaceChildren();
	};
	input.onkeydown = event => {
		if (event.key === 'Enter') {
			event.preventDefault();
			void search();
		}
	};
	searchRow.append(
		input,
		button('搜索', () => search())
	);
	searchColumn.append(searchRow, results);
	const note = document.createElement('p');
	note.className = 'pickup-note';
	note.textContent =
		'自动走向并拾取符合配置的地面物品，包括自己丢弃的物品。手动拾取不受这些配置影响。设置保存在当前浏览器，按角色区分。';
	section.append(controls, note);
}
