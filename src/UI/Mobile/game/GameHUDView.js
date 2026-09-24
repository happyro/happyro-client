import { createAutoCombatPanel } from './AutoCombatPanel.js';
import { createNavigationPanel } from './NavigationPanel.js';
import { createCompanionsPanel } from './CompanionsPanel.js';
import { createPetPanel } from './PetPanel.js';
import { createMailPanel } from './MailPanel.js';
import { createSettingsPanel } from './SettingsPanel.js';
import { createBankPanel } from './BankPanel.js';
import { createVendingPanel } from './VendingPanel.js';
import { createTradePanel } from './TradePanel.js';
import { createEquipmentSetsPanel } from './EquipmentSetsPanel.js';
import { createEnchantPanel } from './EnchantPanel.js';
import { createRefinementPanel } from './RefinementPanel.js';
import { createMaterialsPanel } from './MaterialsPanel.js';
import { createSelectionPanel } from './SelectionPanel.js';
import { createSocialPanel } from './SocialPanel.js';
import { createChatPanel } from './ChatPanel.js';
import { createQuestsPanel } from './QuestsPanel.js';
import { createMapsPanel } from './MapsPanel.js';
import { createContainerPanel } from './ContainerPanel.js';
import { createShopPanel } from './ShopPanel.js';
import { createNPCPanel, updateNPCCutin } from './NPCPanel.js';
import { createSkillsPanel } from './SkillsPanel.js';
import { createEquipmentPanel } from './EquipmentPanel.js';
import { createInventoryPanel } from './InventoryPanel.js';
import { createShortcutPanel } from './ShortcutPanel.js';
import html from './GameHUD.html?raw';
import css from './GameHUD.css?raw';
import responsiveCSS from './GameHUDResponsive.css?raw';
import panelsCSS from './MenuPanels.css?raw';

/** DOM-only view; no packets, desktop windows or map event handlers. */
export function createGameHUDView(root, actions) {
	root.innerHTML = `<style>${css}
${responsiveCSS}
${panelsCSS}</style>${html}`;
	const $ = selector => root.querySelector(selector);
	const abort = new AbortController();
	let currentPanel = null;
	let serverState = null;
	let shortcutPanel = null;
	let inventoryPanel = null;
	let equipmentPanel = null;
	let skillsPanel = null;
	let questsPanel = null;
	let mapsPanel = null;
	let navigationPanel = null;
	let chatPanel = null;
	let socialPanel = null;
	let selectionPanel = null;
	let materialsPanel = null;
	let refinementPanel = null;
	let enchantPanel = null;
	let equipmentSetsPanel = null;
	let petPanel = null;
	let companionsPanel = null;
	let mailPanel = null;
	let bankPanel = null;
	let vendingPanel = null;
	let tradePanel = null;
	let shopPanel = null;
	let containerPanel = null;
	let noticeUntil = 0;
	let backdropPointer = null;
	let dismissBackdrop = false;
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
		if (!event.target.closest('.combat, .battle-dock')) actions.cancelSceneInput();
	});
	listen($('[data-auto-toggle]'), 'click', () => actions.toggleAutoCombat());
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
	function close(notify = true) {
		if (!currentPanel || (notify && serverState?.canClose === false)) return;
		const interaction = serverState;
		serverState = null;
		currentPanel = null;
		shortcutPanel = null;
		inventoryPanel = null;
		equipmentPanel = null;
		skillsPanel = null;
		petPanel = null;
		companionsPanel = null;
		mailPanel = null;
		bankPanel = null;
		vendingPanel = null;
		tradePanel = null;
		shopPanel = null;
		containerPanel = null;
		questsPanel = null;
		chatPanel = null;
		socialPanel = null;
		selectionPanel = null;
		materialsPanel = null;
		refinementPanel = null;
		enchantPanel = null;
		equipmentSetsPanel = null;
		mapsPanel?.destroy();
		navigationPanel?.destroy();
		navigationPanel = null;
		mapsPanel = null;
		backdrop.hidden = true;
		actions.setModal(false);
		lastTrigger?.focus();
		if (notify) interaction?.close?.();
	}
	function updateMessages() {
		text(
			'[data-chat-preview]',
			messages
				.slice(-2)
				.map(message => message.text)
				.join('\n') || '暂无消息'
		);
		chatPanel?.update(messages);
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
		dl.className = 'character-details';
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
		$('.panel').dataset.view = panel;
		backdropPointer = null;
		dismissBackdrop = false;
		backdrop.hidden = false;
		actions.setModal(true);
		text(
			'h2',
			{
				autoCombat: '自动战斗设置',
				settings: '设置',
				profile: '人物信息',
				status: '状态效果',
				map: '地图',
				navigation: '导航',
				menu: '菜单',
				chat: '聊天',
				camera: '镜头',
				shortcuts: '快捷配置',
				inventory: '背包',
				equipment: '装备',
				equipmentSets: '装备方案',
				skills: '技能',
				quests: '任务',
				social: '社交',
				transformation: serverState?.title,
				information: serverState?.title,
				selection: serverState?.title,
				materials: serverState?.title,
				refinement: serverState?.title,
				enchant: serverState?.title,
				cart: '手推车',
				storage: serverState?.title || '仓库',
				pet: serverState?.title,
				companions: serverState?.title,
				mail: serverState?.title,
				bank: serverState?.title,
				vending: serverState?.title,
				trade: serverState?.title,
				shop: serverState?.title,
				npc: serverState?.title || 'NPC 对话'
			}[panel]
		);
		$('[data-close]').disabled = serverState?.canClose === false;
		body.replaceChildren();
		body.classList.toggle('settings-body', panel === 'settings');
		$('.panel').classList.toggle('settings-panel', panel === 'settings');
		$('.panel').classList.toggle('profile-panel', panel === 'profile');
		body.classList.toggle('equipment-body', panel === 'equipment');
		$('.panel').classList.toggle('equipment-panel', panel === 'equipment');
		body.classList.toggle(
			'inventory-body',
			[
				'mail',
				'navigation',
				'inventory',
				'skills',
				'shop',
				'trade',
				'vending',
				'storage',
				'cart',
				'quests',
				'map',
				'social',
				'selection',
				'transformation',
				'refinement',
				'enchant',
				'equipmentSets',
				'materials'
			].includes(panel)
		);
		$('.panel').classList.toggle(
			'inventory-panel',
			[
				'mail',
				'navigation',
				'inventory',
				'skills',
				'shop',
				'trade',
				'vending',
				'storage',
				'cart',
				'quests',
				'map',
				'social',
				'selection',
				'transformation',
				'refinement',
				'enchant',
				'equipmentSets',
				'materials'
			].includes(panel)
		);
		body.classList.toggle('shortcut-body', panel === 'shortcuts');
		body.classList.toggle('auto-config-body', panel === 'autoCombat');
		$('.panel').classList.toggle('auto-config-panel', panel === 'autoCombat');
		$('.panel').classList.toggle('shortcut-panel', panel === 'shortcuts');
		body.classList.toggle('chat-body', panel === 'chat');
		$('.panel').classList.toggle('chat-panel', panel === 'chat');
		if (panel === 'information') {
			const list = document.createElement('dl');
			for (const [label, value] of serverState.rows) {
				const term = document.createElement('dt'),
					description = document.createElement('dd');
				term.textContent = label;
				description.textContent = String(value);
				list.append(term, description);
			}
			body.append(list);
		}
		if (panel === 'autoCombat') createAutoCombatPanel(body, { ...actions.autoCombat, close });
		if (panel === 'settings') createSettingsPanel(body, actions.settings);
		if (panel === 'npc') createNPCPanel(body, serverState);
		if (panel === 'profile' || panel === 'status') renderDetails();
		if (panel === 'menu') {
			const grid = document.createElement('div');
			grid.className = 'menu-grid';
			for (const [label, panelName] of [
				['设置', 'settings'],
				['人物', 'profile'],
				['地图', 'map'],
				['导航', 'navigation'],
				// ['聊天', 'chat'], // 聊天 UI 暂时隐藏。
				['状态', 'status'],
				['镜头', 'camera'],
				['快捷配置', 'shortcuts'],
				['背包', 'inventory'],
				['装备', 'equipment'],
				['装备方案', 'equipmentSets'],
				['技能', 'skills'],
				['手推车', 'cart'],
				['任务', 'quests'],
				['社交', 'social']
			]) {
				const button = document.createElement('button');
				button.textContent = label;
				button.disabled = !panelName;
				if (panelName) button.onclick = () => open(panelName);
				grid.append(button);
			}
			const petButton = document.createElement('button');
			petButton.textContent = '宠物';
			petButton.onclick = () => actions.openPet();
			grid.append(petButton);
			for (const [kind, label] of [
				['homunculus', '生命体'],
				['mercenary', '佣兵']
			]) {
				const button = document.createElement('button');
				button.textContent = label;
				button.onclick = () => actions.openCompanion(kind);
				grid.append(button);
			}
			const mailButton = document.createElement('button');
			mailButton.textContent = '邮件';
			mailButton.onclick = () => actions.openMail();
			grid.append(mailButton);
			const bankButton = document.createElement('button');
			bankButton.textContent = '银行';
			bankButton.onclick = () => {
				bankButton.textContent = actions.openBank();
			};
			grid.append(bankButton);
			const storeButton = document.createElement('button');
			storeButton.textContent = '我的摊位';
			storeButton.onclick = () => {
				if (!actions.showOwnedVending()) storeButton.textContent = '尚未开店：请先使用摆摊或收购技能';
			};
			grid.append(storeButton);
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
		inventoryPanel = null;
		equipmentPanel = null;
		skillsPanel = null;
		petPanel = null;
		companionsPanel = null;
		mailPanel = null;
		bankPanel = null;
		vendingPanel = null;
		tradePanel = null;
		shopPanel = null;
		containerPanel = null;
		questsPanel = null;
		chatPanel = null;
		socialPanel = null;
		selectionPanel = null;
		materialsPanel = null;
		refinementPanel = null;
		enchantPanel = null;
		equipmentSetsPanel = null;
		mapsPanel?.destroy();
		navigationPanel?.destroy();
		navigationPanel = null;
		mapsPanel = null;
		if (panel === 'social') socialPanel = createSocialPanel(body, actions.social, name => open('chat', name));
		if (panel === 'quests')
			questsPanel = createQuestsPanel(body, {
				snapshot: actions.questSnapshot,
				toggle: actions.questToggle,
				showMap: target => open('map', target)
			});
		if (panel === 'navigation') navigationPanel = createNavigationPanel(body, actions.canOperate);
		if (panel === 'map') mapsPanel = createMapsPanel(body, actions.maps, drawMap, slotIndex);
		if (panel === 'storage' || panel === 'cart')
			containerPanel = createContainerPanel(
				body,
				{ snapshot: actions.containerSnapshot, transfer: actions.transferItem },
				panel
			);
		if (panel === 'equipmentSets') equipmentSetsPanel = createEquipmentSetsPanel(body, actions.equipmentSets);
		if (panel === 'enchant') {
			serverState.service.setOperationGuard(actions.canOperate);
			enchantPanel = createEnchantPanel(body, serverState.service);
		}
		if (panel === 'refinement') {
			serverState.service.setOperationGuard(actions.canOperate);
			refinementPanel = createRefinementPanel(body, serverState.service);
		}
		if (panel === 'materials' || panel === 'transformation') {
			serverState.service.setOperationGuard(actions.canOperate);
			materialsPanel = createMaterialsPanel(body, serverState.service);
		}
		if (panel === 'selection') {
			serverState.service.setOperationGuard(actions.canOperate);
			selectionPanel = createSelectionPanel(body, serverState.service);
		}
		if (panel === 'companions') {
			serverState.service.setOperationGuard(actions.canOperate);
			companionsPanel = createCompanionsPanel(body, serverState.service);
		}
		if (panel === 'pet') {
			serverState.service.setOperationGuard(actions.canOperate);
			petPanel = createPetPanel(body, serverState.service);
		}
		if (panel === 'mail') {
			serverState.service.setOperationGuard(actions.canOperate);
			mailPanel = createMailPanel(body, serverState.service);
		}
		if (panel === 'bank') {
			serverState.service.setOperationGuard(actions.canOperate);
			bankPanel = createBankPanel(body, serverState.service);
		}
		if (panel === 'vending') {
			serverState.service.setOperationGuard(actions.canOperate);
			vendingPanel = createVendingPanel(body, serverState.service);
		}
		if (panel === 'trade') {
			serverState.service.setOperationGuard(actions.canOperate);
			tradePanel = createTradePanel(body, serverState.service);
		}
		if (panel === 'shop') {
			serverState.service.setOperationGuard(actions.canOperate);
			shopPanel = createShopPanel(body, serverState.service);
		}
		if (panel === 'skills')
			skillsPanel = createSkillsPanel(body, {
				snapshot: actions.skillsSnapshot,
				learn: actions.skillsLearn,
				bind: actions.skillsBind,
				shortcuts: actions.shortcutSnapshot,
				slotName: actions.shortcutName
			});
		if (panel === 'equipment')
			equipmentPanel = createEquipmentPanel(body, {
				snapshot: actions.equipmentSnapshot,
				act: actions.equipmentAct
			});
		if (panel === 'inventory')
			inventoryPanel = createInventoryPanel(body, {
				snapshot: actions.inventorySnapshot,
				act: actions.inventoryAct,
				drop: actions.inventoryDrop,
				shortcuts: actions.shortcutSnapshot,
				slotName: actions.shortcutName,
				bind: actions.bindInventory
			});
		if (panel === 'shortcuts')
			shortcutPanel = createShortcutPanel(body, {
				index: slotIndex,
				snapshot: actions.shortcutSnapshot,
				candidates: actions.shortcutCandidates,
				configure: actions.configureShortcut
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
			chatPanel = createChatPanel(body, actions.sendChat, slotIndex);
			updateMessages();
		}
		$('h2').focus();
	}
	for (const button of root.querySelectorAll('[data-panel]'))
		listen(button, 'click', () => open(button.dataset.panel));
	listen($('[data-close]'), 'click', () => close());
	// A touch held before opening the panel must not dismiss it on release.
	listen(backdrop, 'pointerdown', event => {
		backdropPointer = event.target === backdrop ? event.pointerId : null;
		dismissBackdrop = false;
	});
	listen(backdrop, 'pointerup', event => {
		dismissBackdrop = event.target === backdrop && backdropPointer !== null && backdropPointer === event.pointerId;
		backdropPointer = null;
	});
	listen(backdrop, 'pointercancel', () => {
		backdropPointer = null;
		dismissBackdrop = false;
	});
	listen(backdrop, 'click', event => {
		if (event.target === backdrop && dismissBackdrop) close();
		dismissBackdrop = false;
	});
	listen(root, 'keydown', event => {
		if (!currentPanel) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			close();
		}
		if (event.key === 'Tab') {
			const items = [...backdrop.querySelectorAll('button, input, select, textarea, [tabindex]')].filter(
				item => !item.disabled && item.tabIndex >= 0 && item.getClientRects().length > 0
			);
			const index = items.indexOf(root.activeElement);
			event.preventDefault();
			items[(index + (event.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
		}
	});
	return {
		update(next) {
			snapshot = next;
			text('[data-panel=menu]', next.unreadMail ? '菜单 · 新邮件' : '菜单');
			if (performance.now() >= noticeUntil) text('[data-target]', next.autoCombat?.status || '自动战斗已停止');
			const species = next.autoCombat?.species || [];
			const targetLabel = species.length > 1 ? `${species.length} 种魔物` : species[0]?.name || '全部魔物';
			text('[data-auto-target]', `${targetLabel} ▾`);
			$('[data-auto-target]').title = species.map(entry => entry.name).join('、') || '全部魔物';
			text('[data-auto-toggle]', next.autoCombat?.active ? '停止战斗' : '自动战斗');
			$('[data-auto-toggle]').setAttribute('aria-pressed', String(Boolean(next.autoCombat?.active)));
			$('[data-interact]').hidden = !next.target?.interaction;
			text('[data-interact]', next.target?.interaction);
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
			inventoryPanel?.update();
			equipmentPanel?.update();
			skillsPanel?.update();
			petPanel?.update();
			companionsPanel?.update();
			mailPanel?.update();
			bankPanel?.update();
			vendingPanel?.update();
			tradePanel?.update();
			shopPanel?.update();
			containerPanel?.update();
			questsPanel?.update();
			socialPanel?.update();
			selectionPanel?.update();
			materialsPanel?.update();
			refinementPanel?.update();
			enchantPanel?.update();
			equipmentSetsPanel?.update();
		},
		setMap(image) {
			mapImage = image;
			drawMap($('[data-mini-map]'));
		},
		setMessages(next) {
			messages = next;
			updateMessages();
		},
		showInteraction(state) {
			if (!state) {
				if (serverState) close(false);
				return;
			}
			if (serverState?.token === state.token && currentPanel === 'npc') {
				serverState = state;
				updateNPCCutin(body, state);
				return;
			}
			serverState = state;
			open(
				[
					'shop',
					'trade',
					'vending',
					'mail',
					'pet',
					'companions',
					'bank',
					'storage',
					'selection',
					'materials',
					'refinement',
					'enchant',
					'information',
					'transformation'
				].includes(state.kind)
					? state.kind
					: 'npc'
			);
		},
		openShortcuts: index => open('shortcuts', index),
		updateShortcuts(state) {
			shortcutPanel?.updateIcons(actions.shortcutCandidates());
			text('[data-shortcut-page-label]', `${state.page + 1}/${state.pages}`);
			for (const button of root.querySelectorAll('[data-shortcut]')) {
				const slot = state.slots[Number(button.dataset.shortcut)];
				button.hidden = !slot;
				button.disabled = Boolean(slot?.unavailable);
				button.classList.toggle('selected-skill', Boolean(slot && state.pending?.index === slot.index));
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
			$('.battle-status').hidden = Boolean(state.pending);
			$('.skill-prompt').hidden = !state.pending;
			$('.skill-actions').hidden = !state.pending;
			$('.shortcut-tools').hidden = Boolean(state.pending);
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
			close(false);
			abort.abort();
			root.replaceChildren();
		}
	};
}
