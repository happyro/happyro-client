import CombatDiagnostics from 'Core/CombatDiagnostics.js';
import { createGameAutoCombat } from 'UI/Game/GameAutoCombat.js';
import { openGameCompanions } from 'UI/Game/GameCompanions.js';
import { openGamePet } from 'UI/Game/GamePet.js';
import { openGameMail, gameMailUnread } from 'UI/Game/GameMail.js';
import { graphicsFields, settingsSnapshot, saveGameSettings } from 'UI/Game/GameSettings.js';
import { requestGameBank } from 'UI/Game/GameBank.js';
import { showOwnedVending } from 'UI/Game/GameVending.js';
import { createGameEquipmentSets } from 'UI/Game/GameEquipmentSets.js';
import { createGameSocial } from 'UI/Game/GameSocial.js';
import { createGameChat, chatChannel } from 'UI/Game/GameChat.js';
import { createGameQuests } from 'UI/Game/GameQuests.js';
import { createGameMaps } from 'UI/Game/GameMaps.js';
import { createGameContainers } from 'UI/Game/GameContainers.js';
import { subscribeInteraction, clearInteraction } from 'UI/Game/ServerInteraction.js';
import { createGameSkills } from 'UI/Game/GameSkills.js';
import { createEquipmentController } from 'UI/Game/GameEquipment.js';
import { characterStats } from 'UI/Game/CharacterStats.js';
import { clearAttackIntent } from 'Controls/AttackIntent.js';
import { createGameInventory } from 'UI/Game/GameInventory.js';
import { createGameShortcuts } from 'UI/Game/GameShortcuts.js';
import Renderer from 'Renderer/Renderer.js';
import * as Commands from 'UI/Game/GameCommands.js';
import { bindPointerControls } from './PointerControls.js';
import GUIComponent from 'UI/GUIComponent.js';
import UIManager from 'UI/UIManager.js';
import Session from 'Engine/SessionStorage.js';
import Platform from 'UI/Platform.js';
import Mobile from 'Core/Mobile.js';
import Mouse from 'Controls/MouseEventHandler.js';
import MapControl from 'Controls/MapControl.js';
import Altitude from 'Renderer/Map/Altitude.js';
import MapRenderer from 'Renderer/MapRenderer.js';
import DB from 'DB/DBManager.js';
import { getJobDisplayName } from 'DB/Jobs/JobDisplayNameTable.js';
import StatusIcons from 'UI/Components/StatusIcons/StatusIcons.js';
import { subscribeChatFeed } from 'UI/Game/ChatFeed.js';
import { onConnectionEnd } from 'Network/ConnectionLifecycle.js';
import { createGameHUDView } from './GameHUDView.js';

const HUD = new GUIComponent('MobileGameHUD', '');
HUD.render = () => '';
HUD.mouseMode = GUIComponent.MouseMode.CROSS;
HUD.needFocus = false;
HUD.nativeScrolling = true;
let view;
let controls;
let shortcuts;
let autoCombat;
let inventory;
let equipment;
let containers;
let skills;
let quests;
let chat;
let social;
let timer;
let unsubscribe;
let unsubscribeOrientation;
let unsubscribeConnection;
let unsubscribeInteraction;
let abort;
let previousFreeze;
let modal = false;
HUD.actions = {};

function cancelSceneInput() {
	autoCombat?.stop();
	shortcuts?.cancel();
	controls?.cancel();
	Session.moveAction = null;
	Mobile.cancelInteraction();
	MapControl.onRequestStopWalk();
}
function setModal(value) {
	if (value === modal) return;
	modal = value;
	if (value) {
		previousFreeze = Session.FreezeUI;
		cancelSceneInput();
		Session.FreezeUI = true;
		Mouse.intersect = false;
	} else {
		Session.FreezeUI = previousFreeze;
	}
}
function snapshot() {
	const entity = Session.Entity;
	if (!entity) return;
	const diagnosticStart = CombatDiagnostics.begin();
	if (!controls?.isMoving() && entity.action !== entity.ACTION.WALK) autoCombat?.resumeAfterMovement();
	autoCombat?.tick();
	view.updateShortcuts(shortcuts.snapshot());
	view.update({
		autoCombat: autoCombat.snapshot(),
		unreadMail: gameMailUnread(),
		name: entity.display.name,
		job: getJobDisplayName(entity.job),
		level: entity.clevel,
		jobLevel: entity.joblevel,
		money: entity.money,
		hp: entity.life.hp,
		maxHp: entity.life.hp_max,
		sp: entity.life.sp,
		maxSp: entity.life.sp_max,
		position: [entity.position[0], entity.position[1]],
		mapName: DB.getMapName(MapRenderer.currentMap, MapRenderer.currentMap),
		statuses: StatusIcons.getSnapshot(),
		target: Commands.targetSnapshot()
	});
	CombatDiagnostics.end('mobile.hud', diagnosticStart);
}
/** Render the actual walkability grid once per map, rather than sample a desktop canvas. */
function createMap() {
	const width = Altitude.width,
		height = Altitude.height;
	const extent = Math.max(width, height);
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = 256;
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = '#18232d';
	ctx.fillRect(0, 0, 256, 256);
	if (extent) {
		for (let y = 0; y < 256; y++)
			for (let x = 0; x < 256; x++) {
				const cellX = Math.floor((x / 256) * extent - (extent - width) / 2);
				const cellY = height - 1 - Math.floor((y / 256) * extent - (extent - height) / 2);
				if (cellX < 0 || cellY < 0 || cellX >= width || cellY >= height) continue;
				const type = Altitude.getCellType(cellX, cellY);
				if (!(type & (Altitude.TYPE.WALKABLE | Altitude.TYPE.WATER))) continue;
				ctx.fillStyle = type & Altitude.TYPE.WATER ? '#58899e' : '#bec9ce';
				ctx.fillRect(x, y, 1, 1);
			}
	}
	return { canvas, width, height };
}
function updateViewport() {
	const viewport = window.visualViewport;
	HUD._host.style.height = `${viewport?.height || window.innerHeight}px`;
	HUD._host.style.width = `${viewport?.width || window.innerWidth}px`;
	HUD._host.style.top = `${viewport?.offsetTop || 0}px`;
	HUD._host.style.left = `${viewport?.offsetLeft || 0}px`;
}
HUD.onAppend = function () {
	// Repeated map mounting must not duplicate subscriptions or timers.
	HUD.onRemove(false);
	abort = new AbortController();
	const enabled = () =>
		Boolean(
			!Session.FreezeUI &&
			Session.Playing &&
			!document.hidden &&
			Platform.orientation === 'landscape' &&
			Session.Entity &&
			Session.Entity.action !== Session.Entity.ACTION.DIE
		);
	autoCombat = createGameAutoCombat(enabled);
	shortcuts = createGameShortcuts(() => controls?.isMoving() || false);
	inventory = createGameInventory(() => modal && !previousFreeze);
	containers = createGameContainers(() => modal && !previousFreeze);
	social = createGameSocial(() => modal && !previousFreeze, shortcuts);
	chat = createGameChat(
		(...args) => HUD.actions.sendChat(...args),
		() => modal && !previousFreeze
	);
	quests = createGameQuests(() => modal && !previousFreeze);
	skills = createGameSkills(() => modal && !previousFreeze, shortcuts);
	equipment = createEquipmentController(inventory, () => characterStats(Session.Entity));
	view = createGameHUDView(HUD.getRoot(), {
		cancelSceneInput,
		setModal,
		interact: () => {
			autoCombat.stop();
			Commands.interactSelected();
		},
		toggleAutoCombat: () => {
			if (autoCombat.snapshot().active) autoCombat.stop();
			else {
				shortcuts.cancel();
				controls.cancel();
				if (!autoCombat.start()) view.notice('当前不能开始自动战斗');
			}
			snapshot();
		},
		autoCombat: {
			snapshot: () => autoCombat.snapshot(),
			targets: () => autoCombat.targets(),
			skills: () => autoCombat.skills(),
			configure: (...args) => autoCombat.configure(...args)
		},
		camera: Commands.adjustCamera,
		shortcutPage: delta => {
			shortcuts.turn(delta);
			snapshot();
		},
		settings: { fields: graphicsFields, snapshot: settingsSnapshot, save: saveGameSettings },
		openCompanion: kind => openGameCompanions(kind, () => modal && !previousFreeze),
		openPet: () => openGamePet(() => modal && !previousFreeze),
		openMail: () => openGameMail(() => modal && !previousFreeze),
		openBank: () => requestGameBank(() => modal && !previousFreeze),
		showOwnedVending,
		canOperate: () => modal && !previousFreeze,
		maps: createGameMaps(),
		social,
		equipmentSets: createGameEquipmentSets(() => modal && !previousFreeze),
		questSnapshot: () => quests.snapshot(),
		questToggle: (...args) => quests.toggle(...args),
		containerSnapshot: source => containers.snapshot(source),
		transferItem: (...args) => containers.transfer(...args),
		skillsSnapshot: () => skills.snapshot(),
		skillsLearn: (...args) => skills.learn(...args),
		skillsBind: (...args) => skills.bind(...args),
		equipmentSnapshot: () => equipment.snapshot(),
		equipmentAct: (...args) => equipment.act(...args),
		inventorySnapshot: () => inventory.snapshot(),
		inventoryDrop: (...args) => inventory.drop(...args),
		inventoryAct: (...args) => inventory.act(...args),
		bindInventory: (index, id, slot) =>
			inventory.canBind(index, id) && shortcuts.configure(slot, { isSkill: false, ID: id }),
		shortcutName: index => shortcuts.slotName(index),
		shortcutSnapshot: () => shortcuts.snapshot(),
		shortcutCandidates: () => shortcuts.candidates(),
		configureShortcut: (...args) => shortcuts.configure(...args),
		cancelSkill: () => {
			shortcuts.cancel();
			snapshot();
		},
		selfSkill: () => {
			shortcuts.self();
			snapshot();
		},
		sendChat: (...args) => chat.send(...args),
		returnToCharacters: () => HUD.actions.returnToCharacters()
	});
	unsubscribeInteraction = subscribeInteraction(state => view.showInteraction(state));
	controls = bindPointerControls(HUD.getRoot(), Renderer.canvas, {
		enabled,
		startMove: () => {
			autoCombat.pauseForMovement();
			shortcuts.cancel();
		},
		move: (x, y) => {
			autoCombat.pauseForMovement();
			Commands.moveDirection(x, y);
		},
		stopMove: () => {
			MapControl.onRequestStopWalk();
			Session.moveAction = null;
		},
		shortcut: slot => {
			autoCombat.stop('手动施法，自动战斗已停止');
			Commands.stopAttack();
			const index = shortcuts.snapshot().slots[slot].index;
			const result = shortcuts.use(index);
			snapshot();
			if (result.configure !== undefined) view.openShortcuts(result.configure);
			if (result.message) view.notice(result.message);
		},
		tap: (x, y) => {
			const hit = Commands.pickSceneEntity(x, y);
			if (
				hit &&
				[hit.constructor.TYPE_ITEM, hit.constructor.TYPE_NPC, hit.constructor.TYPE_NPC2].includes(
					hit.objecttype
				)
			) {
				autoCombat.stop('手动操作，自动战斗已停止');
				shortcuts.cancel();
				Commands.tapScene(x, y);
			} else if (shortcuts.snapshot().pending) {
				autoCombat.stop('手动施法，自动战斗已停止');
				shortcuts.pick(x, y);
			} else if (hit && hit.objecttype === hit.constructor.TYPE_MOB) {
				if (!autoCombat.attackTarget(hit.GID)) view.notice('当前无法攻击这只魔物');
			} else {
				autoCombat.stop('手动操作，自动战斗已停止');
				Commands.tapScene(x, y);
			}

			snapshot();
		}
	});
	view.setMap(createMap());
	snapshot();
	unsubscribe = subscribeChatFeed(messages => {
		view.setMessages(
			messages.map(message => {
				if (!message.html) return { text: message.text, channel: chatChannel(message) };
				const parsed = new DOMParser().parseFromString(message.text, 'text/html');
				return { text: parsed.body.textContent || '', channel: chatChannel(message) };
			})
		);
	});
	timer = window.setInterval(snapshot, 200);
	const cancel = () => {
		cancelSceneInput();
		view.close();
	};
	window.addEventListener('blur', cancel, { signal: abort.signal });
	document.addEventListener(
		'visibilitychange',
		() => {
			if (document.hidden) cancel();
		},
		{ signal: abort.signal }
	);
	unsubscribeOrientation = Platform.onOrientationChange(() => cancel());
	unsubscribeConnection = onConnectionEnd(() => HUD.remove());
	for (const type of ['resize', 'scroll'])
		window.visualViewport?.addEventListener(type, updateViewport, { signal: abort.signal });
	window.addEventListener('resize', updateViewport, { signal: abort.signal });
	updateViewport();
};
HUD.onRemove = function (resetInteraction = true) {
	autoCombat?.stop();
	autoCombat = null;
	unsubscribeInteraction?.();
	unsubscribeInteraction = null;
	if (resetInteraction) clearInteraction();
	controls?.destroy();
	controls = null;
	shortcuts?.cancel();
	shortcuts = null;
	inventory = null;
	equipment = null;
	skills = null;
	quests = null;
	chat = null;
	social = null;
	containers = null;
	clearAttackIntent();
	clearInterval(timer);
	timer = null;
	unsubscribe?.();
	unsubscribe = null;
	unsubscribeOrientation?.();
	unsubscribeOrientation = null;
	unsubscribeConnection?.();
	unsubscribeConnection = null;
	abort?.abort();
	abort = null;
	if (view) {
		cancelSceneInput();
		view.destroy();
		view = null;
	}
};
export default UIManager.addComponent(HUD);
