import { createShortcutPanel } from './ShortcutPanel.js';
import html from './GameHUD.html?raw';
import css from './GameHUD.css?raw';

/** DOM-only view; no packets, desktop windows or map event handlers. */
export function createGameHUDView(root, actions) {
	root.innerHTML = `<style>${css}</style>${html}`;
	const $ = selector => root.querySelector(selector);
	const abort = new AbortController();
	let currentPanel = null;
	let shortcutPanel = null;
	let noticeUntil = 0;
	let lastTrigger;
	let snapshot = {};
	let messages = [];
	let mapImage;
	const backdrop = $('.backdrop');
	const body = $('.panel-body');
	const listen = (node, type, handler) => node.addEventListener(type, handler, { signal: abort.signal });
	// Bubble only: inner controls keep native clicks, selection and scrolling.
	for (const type of [
		'pointerdown',
		'pointerup',
		'pointermove',
		'pointercancel',
		'mousedown',
		'mouseup',
		'click',
		'dblclick',
		'contextmenu',
		'touchstart',
		'touchmove',
		'touchend',
		'touchcancel',
		'wheel',
		'keydown',
		'keyup'
	]) {
		listen(root, type, event => {
			event.stopPropagation();
		});
	}
	listen(root, 'pointerdown', event => {
		if (!event.target.closest('.joystick, .combat, .skill-prompt')) actions.cancelSceneInput();
	});
	listen($('[data-interact]'), 'click', () => actions.interact());
	for (const button of root.querySelectorAll('[data-shortcut-page]'))
		listen(button, 'click', () => actions.shortcutPage(Number(button.dataset.shortcutPage)));
	listen($('[data-skill-cancel]'), 'click', () => actions.cancelSkill());
	listen($('[data-skill-self]'), 'click', () => actions.selfSkill());
	const text = (selector, value) => {
		$(selector).textContent = value ?? '';
	};
	function drawMap(canvas) {
		if (!canvas || !mapImage) return;
		const ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(mapImage.canvas, 0, 0, canvas.width, canvas.height);
		const extent = Math.max(mapImage.width, mapImage.height);
		if (!extent || !snapshot.position) return;
		const x = ((snapshot.position[0] + (extent - mapImage.width) / 2) / extent) * canvas.width;
		const y = ((extent - snapshot.position[1] - (extent - mapImage.height) / 2) / extent) * canvas.height;
		ctx.fillStyle = '#ffca67';
		ctx.beginPath();
		ctx.arc(x, y, 3, 0, Math.PI * 2);
		ctx.fill();
	}
	function close() {
		if (!currentPanel) return;
		currentPanel = null;
		shortcutPanel = null;
		backdrop.hidden = true;
		actions.setModal(false);
		lastTrigger?.focus();
	}
	function updateMessages() {
		text('[data-chat-preview]', messages.slice(-2).join('\n') || '暂无消息');
		const log = $('.chat-log');
		if (log) {
			const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 24;
			log.replaceChildren(
				...messages.map(message => {
					const p = document.createElement('p');
					p.textContent = message;
					return p;
				})
			);
			if (atBottom) log.scrollTop = log.scrollHeight;
		}
	}
	function details(entries) {
		const dl = document.createElement('dl');
		for (const [label, value] of entries) {
			const dt = document.createElement('dt');
			dt.textContent = label;
			const dd = document.createElement('dd');
			dd.textContent = value;
			dl.append(dt, dd);
		}
		body.replaceChildren(dl);
	}
	function renderDetails() {
		if (currentPanel === 'profile')
			details([
				['角色', snapshot.name],
				['职业', snapshot.job],
				['等级', snapshot.level],
				['职业等级', snapshot.jobLevel],
				['HP', `${snapshot.hp} / ${snapshot.maxHp}`],
				['SP', `${snapshot.sp} / ${snapshot.maxSp}`],
				['Zeny', snapshot.money]
			]);
		if (currentPanel === 'status') {
			body.replaceChildren(
				...(snapshot.statuses?.length
					? snapshot.statuses.map(status => {
							const p = document.createElement('p');
							p.textContent = status.description;
							return p;
						})
					: [document.createTextNode('当前没有状态效果')])
			);
		}
	}
	function open(panel, slotIndex) {
		if (!currentPanel) lastTrigger = root.activeElement;
		currentPanel = panel;
		backdrop.hidden = false;
		actions.setModal(true);
		text(
			'h2',
			{
				profile: '人物信息',
				status: '状态效果',
				map: '地图',
				menu: '菜单',
				chat: '聊天',
				camera: '镜头',
				shortcuts: '快捷配置'
			}[panel]
		);
		body.replaceChildren();
		body.classList.toggle('chat-body', panel === 'chat');
		$('.panel').classList.toggle('chat-panel', panel === 'chat');
		if (panel === 'profile' || panel === 'status') renderDetails();
		if (panel === 'map') {
			const canvas = document.createElement('canvas');
			canvas.width = canvas.height = 256;
			canvas.className = 'large-map';
			const name = document.createElement('p');
			name.textContent = snapshot.mapName;
			body.append(name, canvas);
			drawMap(canvas);
		}
		if (panel === 'menu') {
			const grid = document.createElement('div');
			grid.className = 'menu-grid';
			for (const [label, panelName] of [
				['人物', 'profile'],
				['地图', 'map'],
				['聊天', 'chat'],
				['状态', 'status'],
				['镜头', 'camera'],
				['快捷配置', 'shortcuts'],
				['背包'],
				['装备'],
				['技能'],
				['任务'],
				['社交']
			]) {
				const button = document.createElement('button');
				button.textContent = label;
				button.disabled = !panelName;
				if (panelName) button.onclick = () => open(panelName);
				grid.append(button);
			}
			const exit = document.createElement('button');
			exit.textContent = '返回选角';
			exit.onclick = () => {
				close();
				actions.returnToCharacters();
			};
			grid.append(exit);
			body.append(grid);
		}
		shortcutPanel = null;
		if (panel === 'shortcuts')
			shortcutPanel = createShortcutPanel(body, {
				index: slotIndex,
				snapshot: actions.shortcutSnapshot,
				candidates: actions.shortcutCandidates,
				configure: actions.configureShortcut,
				saved: close
			});
		if (panel === 'camera') {
			const grid = document.createElement('div');
			grid.className = 'menu-grid';
			for (const [label, action] of [
				['左转', 'left'],
				['右转', 'right'],
				['拉近', 'zoomIn'],
				['拉远', 'zoomOut'],
				['抬高', 'up'],
				['降低', 'down'],
				['重置', 'reset']
			]) {
				const button = document.createElement('button');
				button.textContent = label;
				button.onclick = () => actions.camera(action);
				grid.append(button);
			}
			body.append(grid);
		}
		if (panel === 'chat') {
			body.innerHTML =
				'<div class="chat-log" role="log" aria-label="聊天消息"></div><form class="chat-form"><input aria-label="聊天内容" placeholder="发送公开消息" maxlength="120" autocomplete="off"><button type="submit">发送</button></form>';
			$('.chat-form').onsubmit = event => {
				event.preventDefault();
				const input = $('.chat-form input');
				const message = input.value.trim();
				if (message) {
					actions.sendChat(message);
					input.value = '';
				}
			};
			updateMessages();
		}
		$('h2').focus();
	}
	for (const button of root.querySelectorAll('[data-panel]'))
		listen(button, 'click', () => open(button.dataset.panel));
	listen($('[data-close]'), 'click', close);
	listen(backdrop, 'click', event => {
		if (event.target === backdrop) close();
	});
	listen(root, 'keydown', event => {
		if (!currentPanel) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			close();
		}
		if (event.key === 'Tab') {
			const items = [...backdrop.querySelectorAll('button:not(:disabled), input')];
			const index = items.indexOf(root.activeElement);
			event.preventDefault();
			items[(index + (event.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
		}
	});
	return {
		update(next) {
			snapshot = next;
			if (performance.now() >= noticeUntil) text('[data-target]', next.target?.name || '点击目标进行选择');
			$('[data-interact]').hidden = !next.target?.interaction;
			text('[data-interact]', next.target?.interaction);
			$('.attack').setAttribute('aria-disabled', String(!next.target?.attack));
			text('[data-name]', next.name);
			text('[data-job]', `Lv.${next.level} ${next.job}`);
			for (const type of ['hp', 'sp']) {
				const max = type === 'hp' ? next.maxHp : next.maxSp;
				$(`[data-${type}]`).max = Math.max(1, max || 0);
				$(`[data-${type}]`).value = next[type] || 0;
				text(`[data-${type}-text]`, `${next[type] ?? 0} / ${max ?? 0}`);
			}
			text('[data-map-name]', next.mapName);
			text('[data-coordinates]', next.position?.map(Math.floor).join(', '));
			text('[data-status-count]', next.statuses?.length || 0);
			const icons = $('[data-status-icons]');
			const iconKey = JSON.stringify(next.statuses?.map(status => [status.id, status.icon]));
			if (icons.dataset.key !== iconKey) {
				icons.dataset.key = iconKey;
				icons.replaceChildren(
					...(next.statuses || [])
						.filter(status => status.icon)
						.slice(0, 4)
						.map(status => {
							const img = document.createElement('img');
							img.src = status.icon;
							img.alt = '';
							return img;
						})
				);
			}
			drawMap($('[data-mini-map]'));
			drawMap($('.large-map'));
			renderDetails();
		},
		setMap(image) {
			mapImage = image;
			drawMap($('[data-mini-map]'));
		},
		setMessages(next) {
			messages = next;
			updateMessages();
		},
		openShortcuts: index => open('shortcuts', index),
		updateShortcuts(state) {
			shortcutPanel?.updateIcons(actions.shortcutCandidates());
			text('[data-shortcut-page-label]', `${state.page + 1}/${state.pages}`);
			for (const button of root.querySelectorAll('[data-shortcut]')) {
				const slot = state.slots[Number(button.dataset.shortcut)];
				button.hidden = !slot;
				if (!slot) continue;
				button.setAttribute(
					'aria-label',
					`槽位 ${slot.index + 1}：${slot.name}${slot.reason ? '，' + slot.reason : ''}`
				);
				button.setAttribute('aria-disabled', String(!slot.available));
				const key = JSON.stringify([
					slot.icon,
					slot.amount,
					slot.empty,
					Math.ceil((slot.cooldown || 0) / 1000)
				]);
				if (button.dataset.content !== key) {
					button.dataset.content = key;
					button.replaceChildren();
					if (slot.empty) button.textContent = '＋';
					else {
						const img = document.createElement('img');
						img.alt = '';
						if (slot.icon) img.src = slot.icon;
						const count = document.createElement('small');
						count.textContent = slot.amount;
						button.append(img, count);
						if (slot.cooldown > 0) {
							const cooldown = document.createElement('b');
							cooldown.className = 'slot-cooldown';
							cooldown.textContent = Math.ceil(slot.cooldown / 1000);
							button.append(cooldown);
						}
					}
				}
			}
			$('.skill-prompt').hidden = !state.pending;
			text(
				'[data-skill-prompt]',
				state.pending ? `${state.pending.name}：${state.pending.ground ? '点击地面施放' : '点击有效目标'}` : ''
			);
			$('[data-skill-self]').hidden = !state.pending?.self;
		},
		notice(message) {
			noticeUntil = performance.now() + 3000;
			text('[data-target]', message);
		},
		close,
		destroy() {
			close();
			abort.abort();
			root.replaceChildren();
		}
	};
}
