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
let timer;
let unsubscribe;
let unsubscribeOrientation;
let unsubscribeConnection;
let abort;
let previousFreeze;
let modal = false;
HUD.actions = {};

function cancelSceneInput() {
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
	view.update({
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
		statuses: StatusIcons.getSnapshot()
	});
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
	HUD.onRemove();
	abort = new AbortController();
	view = createGameHUDView(HUD.getRoot(), {
		cancelSceneInput,
		setModal,
		sendChat: message => HUD.actions.sendChat(message),
		returnToCharacters: () => HUD.actions.returnToCharacters()
	});
	view.setMap(createMap());
	snapshot();
	unsubscribe = subscribeChatFeed(messages => {
		view.setMessages(
			messages.map(message => {
				if (!message.html) return message.text;
				const parsed = new DOMParser().parseFromString(message.text, 'text/html');
				return parsed.body.textContent || '';
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
HUD.onRemove = function () {
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
