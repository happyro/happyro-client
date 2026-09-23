import Trade from 'UI/Components/Trade/Trade.js';
import UIManager from 'UI/UIManager.js';
import { ownAttack, releaseAttack } from 'Controls/AttackIntent.js';
import DB from 'DB/DBManager.js';
import Session from 'Engine/SessionStorage.js';
import EntityManager from 'Renderer/EntityManager.js';
import Camera from 'Renderer/Camera.js';
import Altitude from 'Renderer/Map/Altitude.js';
import Mouse from 'Controls/MouseEventHandler.js';
import MapControl, { checkFreeCell } from 'Controls/MapControl.js';
import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import Navigation from 'UI/Components/Navigation/Navigation.js';

export function selectedTarget() {
	const target = EntityManager.getFocusEntity();
	return target && EntityManager.get(target.GID) === target && target.action !== target.ACTION.DIE ? target : null;
}
export function canAttack(target) {
	if (!target || target === Session.Entity) return false;
	const T = target.constructor;
	return (
		[T.TYPE_MOB, T.TYPE_UNIT, T.TYPE_NPC_ABR, T.TYPE_NPC_BIONIC].includes(target.objecttype) ||
		([T.TYPE_PC, T.TYPE_ELEM, T.TYPE_HOM].includes(target.objecttype) && target.canAttackEntity())
	);
}
export function stopAttack() {
	releaseAttack();
	Session.moveAction = null;
	if (Session.Playing) Network.sendPacket(new PACKET.CZ.CANCEL_LOCKON());
}
export function attackSelected(moving = false) {
	const target = selectedTarget();
	if (canAttack(target)) {
		ownAttack(target.GID, () => {
			if (!Session.FreezeUI && selectedTarget() === target) target.onFocus({ attack: true, allowMove: !moving });
		});
		target.onFocus({ attack: true, allowMove: !moving });
	}
}
export function moveDirection(x, y) {
	const player = Session.Entity;
	if (!player || player.action === player.ACTION.DIE || player.action === player.ACTION.SIT) return;
	Navigation.stopAutoWalk();
	MapControl.onRequestStopWalk();
	Session.moveAction = null;
	Session.autoFollow = false;
	const angle = (-Camera.direction * Math.PI) / 4;
	const dx = x * Math.cos(angle) - y * Math.sin(angle);
	const dy = x * Math.sin(angle) + y * Math.cos(angle);
	const dest = [];
	if (!checkFreeCell(Math.round(player.position[0] + dx * 3), Math.round(player.position[1] + dy * 3), 1, dest))
		return;
	const packet = new PACKET.CZ.REQUEST_MOVE2();
	packet.dest[0] = dest[0];
	packet.dest[1] = dest[1];
	Network.sendPacket(packet);
}
export function pickSceneEntity(x, y) {
	Mouse.screen.x = x;
	Mouse.screen.y = y;
	return EntityManager.intersect();
}
export function tapScene(x, y) {
	Mouse.screen.x = x;
	Mouse.screen.y = y;
	const pos = [];
	const ground = Altitude.intersect(Camera.modelView, Camera.projection, pos);
	Mouse.world.x = ground ? pos[0] : -1;
	Mouse.world.y = ground ? pos[1] : -1;
	const target = EntityManager.intersect();
	const previous = EntityManager.getFocusEntity();
	Session.moveAction = null;
	Session.autoFollow = false;
	if (target && target !== Session.Entity) {
		if (previous && previous !== target) previous.onFocusEnd();
		EntityManager.setFocusEntity(target);
		EntityManager.setOverEntity(target);
		target.onFocus({ attack: false });
		return;
	}
	if (ground) {
		MapControl.onRequestWalk();
		MapControl.onRequestStopWalk();
	}
}
export function interactSelected() {
	const target = selectedTarget();
	if (!target) return;
	const T = target.constructor;
	if (
		target.room?.display &&
		[target.room.constructor.Type.BUY_SHOP, target.room.constructor.Type.SELL_SHOP].includes(target.room.type)
	) {
		target.onRoomEnter();
		return;
	}
	if (target.objecttype === T.TYPE_PC && target !== Session.Entity) {
		UIManager.showPromptBox(`向 ${target.display.name} 发起交易？`, 'ok', 'cancel', () => {
			if (Session.Playing && !Session.FreezeUI && selectedTarget() === target)
				Trade.reqExchange(target.GID, target.display.name);
		});
		return;
	}
	if (![T.TYPE_NPC, T.TYPE_NPC2, T.TYPE_ITEM, T.TYPE_WARP].includes(target.objecttype)) return;
	Mouse.world.x = Math.round(target.position[0]);
	Mouse.world.y = Math.round(target.position[1]);
	target.onMouseDown();
}
export function targetSnapshot() {
	const target = selectedTarget();
	if (!target) return { name: '点击目标进行选择', attack: false, interaction: '' };
	const T = target.constructor;
	return {
		name: target.display.name || '已选目标',
		attack: canAttack(target),
		interaction:
			target.room?.display &&
			[target.room.constructor.Type.BUY_SHOP, target.room.constructor.Type.SELL_SHOP].includes(target.room.type)
				? '查看摊位'
				: target.objecttype === T.TYPE_PC && target !== Session.Entity
					? '交易'
					: target.objecttype === T.TYPE_ITEM
						? '拾取'
						: target.objecttype === T.TYPE_WARP
							? '进入'
							: [T.TYPE_NPC, T.TYPE_NPC2].includes(target.objecttype)
								? '交谈'
								: ''
	};
}

export function adjustCamera(action) {
	const indoor = DB.isIndoor(Camera.currentMap);
	if (action === 'zoomIn' || action === 'zoomOut') Camera.setZoom(action === 'zoomIn' ? 1 : -1);
	else if (action === 'reset') {
		Camera.angleFinal[0] = indoor ? Camera.indoorRange : Camera.range;
		Camera.angleFinal[1] = indoor ? Camera.indoorRotationTo : 0;
		Camera.zoomFinal = 125;
	} else {
		const tilt = action === 'up' || action === 'down';
		const index = tilt ? 0 : 1;
		const min = tilt
			? indoor
				? Camera.MIN_ALTITUDE_INDOOR
				: Camera.MIN_V_ANGLE
			: indoor
				? Camera.indoorRotationFrom
				: Camera.rotationFrom;
		const max = tilt
			? indoor
				? Camera.MAX_ALTITUDE_INDOOR
				: Camera.MAX_V_ANGLE
			: indoor
				? Camera.indoorRotationTo
				: Camera.rotationTo;
		const delta = tilt ? (action === 'up' ? 5 : -5) : action === 'left' ? -15 : 15;
		Camera.angleFinal[index] = Math.max(min, Math.min(max, Camera.angleFinal[index] + delta));
	}
	Camera.save();
}
