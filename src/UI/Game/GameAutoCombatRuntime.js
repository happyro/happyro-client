import Session from 'Engine/SessionStorage.js';
import { subscribeGameInput } from 'Controls/GameInputIntent.js';
import { onConnectionEnd } from 'Network/ConnectionLifecycle.js';
import { createGameAutoCombat } from './GameAutoCombat.js';

/** One map-scoped runtime shared by desktop and touch presentations. */
export function createGameAutoCombatRuntime({
	enabled = () => true,
	isMoving = () => false,
	update = () => {},
	onDisconnect = () => {}
} = {}) {
	let destroyed = false;
	let movementHeld = false;
	let resumeAt = 0;
	const canRun = () =>
		Boolean(
			!destroyed &&
			enabled() &&
			Session.Playing &&
			!Session.FreezeUI &&
			!document.hidden &&
			Session.Entity &&
			Session.Entity.action !== Session.Entity.ACTION.DIE
		);
	const controller = createGameAutoCombat(canRun);
	const abort = new AbortController();
	const stop = message => {
		movementHeld = false;
		controller.stop(message);
		update(controller.snapshot());
	};
	const pauseForMovement = () => {
		controller.pauseForMovement();
		// Do not resume before a newly sent walk request can be reflected by the server.
		resumeAt = performance.now() + 300;
	};
	const unsubscribeInput = subscribeGameInput((kind, targetId) => {
		if (kind === 'move-start') {
			movementHeld = true;
			pauseForMovement();
		} else if (kind === 'move-pulse') {
			pauseForMovement();
		} else if (kind === 'move-end') {
			movementHeld = false;
			resumeAt = performance.now() + 300;
		} else if (kind === 'attack-target') {
			return controller.snapshot().active && controller.attackTarget(targetId);
		} else {
			stop(kind === 'skill' ? '手动施法，自动战斗已停止' : '手动操作，自动战斗已停止');
		}
		return false;
	});
	const timer = window.setInterval(() => {
		if (
			canRun() &&
			!movementHeld &&
			!isMoving() &&
			performance.now() >= resumeAt &&
			Session.Entity?.action !== Session.Entity?.ACTION.WALK
		)
			controller.resumeAfterMovement();
		controller.tick();
		update(controller.snapshot());
	}, 200);
	window.addEventListener('blur', () => stop(), { signal: abort.signal });
	document.addEventListener(
		'visibilitychange',
		() => {
			if (document.hidden) stop();
		},
		{ signal: abort.signal }
	);
	const unsubscribeConnection = onConnectionEnd(() => {
		destroy();
		onDisconnect();
	});
	function destroy() {
		if (destroyed) return;
		destroyed = true;
		clearInterval(timer);
		abort.abort();
		unsubscribeInput();
		unsubscribeConnection();
		stop();
	}
	return { ...controller, stop, pauseForMovement, destroy };
}
