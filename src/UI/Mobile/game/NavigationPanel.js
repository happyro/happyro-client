import { createGameNavigation } from 'UI/Game/GameNavigation.js';

export function createNavigationPanel(body, canOperate) {
	const service = createGameNavigation(canOperate);
	body.innerHTML =
		'<form data-search class="skills-toolbar"><input aria-label="搜索目的地" placeholder="地图、NPC 或魔物"><select aria-label="目的地类型"><option value="ALL">全部类型</option><option value="MAP">地图</option><option value="NPC">NPC</option><option value="MOB">魔物</option></select><select aria-label="搜索范围"><option value="WORLD">所有地图</option><option value="CURRENT">当前地图</option></select><button>搜索</button></form><div class="inventory-layout"><div class="inventory-list" data-results></div><section class="inventory-detail"><form class="social-form" data-route><label>目的地图<input data-map required></label><label>X 坐标<input data-x type="number" min="0" max="1023" step="1" required></label><label>Y 坐标<input data-y type="number" min="0" max="1023" step="1" required></label><button>预览路线</button></form><button data-clear>清除路线</button><ol data-path></ol><p role="status"></p></section></div>';
	const $ = selector => body.querySelector(selector);
	let alive = true;
	const start = service.snapshot();
	$('[data-map]').value = start.currentMap;
	$('[data-x]').value = start.position[0];
	$('[data-y]').value = start.position[1];
	function render() {
		if (!alive) return;
		const state = service.snapshot();
		$('[role=status]').textContent = state.message;
		$('[data-path]').replaceChildren();
		for (const step of state.route) {
			const li = document.createElement('li');
			li.textContent = `${step.map} (${step.x}, ${step.y})${step.warpName ? ' · ' + step.warpName : ''}`;
			$('[data-path]').append(li);
		}
		$('[data-results]').replaceChildren();
		for (const result of state.results) {
			const b = document.createElement('button');
			b.type = 'button';
			b.className = 'inventory-item';
			b.textContent = `${result.name} · ${result.mapDisplayName || result.mapName}${result.hasCoordinates ? ` (${result.x}, ${result.y})` : ''}`;
			b.onclick = () => {
				$('[data-map]').value = result.mapName;
				$('[data-x]').value = result.hasCoordinates ? result.x : '';
				$('[data-y]').value = result.hasCoordinates ? result.y : '';
			};
			$('[data-results]').append(b);
		}
		for (const b of body.querySelectorAll('button')) b.disabled = !state.allowed || state.pending;
		$('[data-clear]').disabled = !state.allowed;
	}
	$('[data-search]').onsubmit = async event => {
		event.preventDefault();
		const pending = service.search(
			$('[aria-label="搜索目的地"]').value,
			$('[aria-label="目的地类型"]').value,
			$('[aria-label="搜索范围"]').value
		);
		render();
		await pending;
		render();
	};
	$('[data-route]').onsubmit = async event => {
		event.preventDefault();
		const pending = service.plan({
			mapName: $('[data-map]').value.trim(),
			x: $('[data-x]').value,
			y: $('[data-y]').value
		});
		render();
		await pending;
		render();
	};
	$('[data-clear]').onclick = () => {
		service.cancel();
		render();
	};
	render();
	return {
		destroy() {
			alive = false;
			service.destroy();
		}
	};
}
