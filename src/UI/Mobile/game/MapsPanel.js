export function createMapsPanel(body, maps, local, target) {
	body.innerHTML =
		'<div class="skills-toolbar"><button type="button" data-local>当前地图</button><select aria-label="世界区域"></select><input aria-label="搜索地图" placeholder="搜索地图名称"></div><div class="inventory-layout"><div class="inventory-list" aria-label="地图列表"></div><section class="inventory-detail map-detail" aria-label="地图详情"></section></div>';
	const $ = selector => body.querySelector(selector),
		detail = $('.map-detail'),
		list = $('.inventory-list');
	const regionSelect = $('select');
	let generation = 0;
	for (const region of maps.regions) regionSelect.add(new Option(region.name, region.id));
	function image(title, load) {
		const request = ++generation;
		detail.replaceChildren();
		const heading = document.createElement('h3');
		heading.textContent = title;
		const status = document.createElement('p');
		status.textContent = '正在加载地图';
		detail.append(heading, status);
		load(url => {
			if (request !== generation) return;
			status.remove();
			if (!url) {
				detail.append(document.createTextNode('地图图片不可用'));
				return;
			}
			const img = document.createElement('img');
			img.className = 'map-preview';
			img.alt = title;
			img.src = url;
			detail.append(img);
		});
	}
	function showMap(map) {
		image(
			`${map.name || maps.mapName(map.id)}（${map.id}）${Number.isFinite(map.x) ? ` · ${map.x}, ${map.y}` : ''}`,
			done => maps.loadMap(map.id, done)
		);
	}
	function showRegion() {
		const region = maps.regions.find(r => r.id === regionSelect.value);
		list.replaceChildren();
		if (!region) return;
		const query = $('input').value.trim().toLocaleLowerCase();
		const whole = document.createElement('button');
		whole.className = 'inventory-item';
		whole.textContent = `${region.name}全图`;
		whole.onclick = () => image(region.name, done => maps.loadRegion(region.id, done));
		list.append(whole);
		for (const map of region.maps.filter(m => `${m.name} ${m.id}`.toLocaleLowerCase().includes(query))) {
			const button = document.createElement('button');
			button.className = 'inventory-item';
			button.textContent = `${map.name} · ${map.id}${map.id === maps.current() ? '（当前位置）' : ''}`;
			button.onclick = () => showMap(map);
			list.append(button);
		}
	}
	regionSelect.onchange = () => {
		showRegion();
		const region = maps.regions.find(r => r.id === regionSelect.value);
		if (region) image(region.name, done => maps.loadRegion(region.id, done));
	};
	$('input').oninput = showRegion;
	$('[data-local]').onclick = () => {
		generation++;
		detail.replaceChildren();
		const title = document.createElement('h3');
		title.textContent = maps.mapName(maps.current());
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = 256;
		canvas.className = 'large-map';
		detail.append(title, canvas);
		local(canvas);
	};
	showRegion();
	if (target) showMap(target);
	else $('[data-local]').click();
	return {
		destroy() {
			generation++;
		}
	};
}
