import Navigation from 'UI/Components/Navigation/Navigation.js';
import { remainingPathFromPosition } from 'UI/Components/Navigation/NavigationAutoWalk.js';
import {
	getCurrentAdventureMap,
	getCurrentAdventurePosition,
	normalizeAdventureMap
} from './AdventureActionService.js';

let timer = null;
let target = null;
let navigationStarted = false;
let navigationState = Navigation.getRouteState();
let status = { active: false, message: '' };
const listeners = new Set();

function matchesTarget(navigationTarget, routeTarget) {
	return Boolean(
		navigationTarget &&
		routeTarget &&
		navigationTarget.map === normalizeAdventureMap(routeTarget.mapName) &&
		navigationTarget.x === routeTarget.x &&
		navigationTarget.y === routeTarget.y
	);
}

function notify() {
	const state = getStatus();
	for (const listener of listeners) listener(state);
}

function getStatus() {
	const routeMatches = matchesTarget(navigationState.target, target);
	const path = routeMatches ? remainingPathFromPosition(navigationState.path, getCurrentAdventurePosition()) : [];
	return {
		...status,
		target: target ? { ...target } : null,
		path,
		pending: routeMatches && navigationState.pending,
		unavailable: routeMatches && navigationState.unavailable
	};
}

function update(active, message) {
	status = { active, message };
	notify();
}

function monitorArrival() {
	if (!target || !status.active) return;
	if (getCurrentAdventureMap() !== normalizeAdventureMap(target.mapName)) {
		stopAdventureRoute('地图已切换，寻路已停止');
		return;
	}
	const position = getCurrentAdventurePosition();
	if (Math.abs(position.x - target.x) <= 1 && Math.abs(position.y - target.y) <= 1) {
		stopAdventureRoute('已到达目的地');
	}
}

export function previewAdventureRoute(nextTarget) {
	if (
		!nextTarget?.mapName ||
		!Number.isFinite(nextTarget.x) ||
		!Number.isFinite(nextTarget.y) ||
		normalizeAdventureMap(nextTarget.mapName) !== getCurrentAdventureMap()
	)
		return false;
	Navigation.stopAutoWalk();
	target = { ...nextTarget };
	navigationStarted = false;
	update(false, '正在计算路径...');
	const position = getCurrentAdventurePosition();
	Navigation.navigateTo({
		startMap: getCurrentAdventureMap(),
		startX: position.x,
		startY: position.y,
		endMap: normalizeAdventureMap(target.mapName),
		endX: target.x,
		endY: target.y,
		displayName: target.mapDisplayName || target.mapName,
		autoWalk: false
	});
	return true;
}

export function startAdventureRoute(nextTarget) {
	if (
		!nextTarget?.mapName ||
		!Number.isFinite(nextTarget.x) ||
		!Number.isFinite(nextTarget.y) ||
		normalizeAdventureMap(nextTarget.mapName) !== getCurrentAdventureMap()
	)
		return false;
	clearInterval(timer);
	Navigation.stopAutoWalk();
	target = { ...nextTarget };
	navigationStarted = false;
	update(true, `正在前往 ${target.mapDisplayName || target.mapName} (${target.x}, ${target.y})`);
	const position = getCurrentAdventurePosition();
	Navigation.navigateTo({
		startMap: getCurrentAdventureMap(),
		startX: position.x,
		startY: position.y,
		endMap: normalizeAdventureMap(target.mapName),
		endX: target.x,
		endY: target.y,
		displayName: target.mapDisplayName || target.mapName,
		autoWalk: true
	});
	timer = setInterval(monitorArrival, 500);
	return true;
}

export function stopAdventureRoute(message = '') {
	clearInterval(timer);
	timer = null;
	navigationStarted = false;
	update(false, message);
	if (message === '已到达目的地') {
		target = null;
		Navigation.clear();
		return;
	}
	Navigation.stopAutoWalk();
}

export function subscribeAdventureRoute(listener) {
	listeners.add(listener);
	listener(getStatus());
	return () => listeners.delete(listener);
}

Navigation.subscribeRouteState(nextState => {
	navigationState = nextState;
	if (!target || !matchesTarget(nextState.target, target)) {
		if (status.active) {
			const position = getCurrentAdventurePosition();
			const arrived =
				target &&
				getCurrentAdventureMap() === normalizeAdventureMap(target.mapName) &&
				Math.abs(position.x - target.x) <= 1 &&
				Math.abs(position.y - target.y) <= 1;
			stopAdventureRoute(arrived ? '已到达目的地' : '寻路已停止');
		} else notify();
		return;
	}
	if (nextState.active) navigationStarted = true;
	if (nextState.unavailable) {
		clearInterval(timer);
		timer = null;
		navigationStarted = false;
		update(false, '无法到达所选位置');
		return;
	}
	if (status.active && navigationStarted && !nextState.active && !nextState.pending) {
		const position = getCurrentAdventurePosition();
		const arrived = Math.abs(position.x - target.x) <= 1 && Math.abs(position.y - target.y) <= 1;
		stopAdventureRoute(arrived ? '已到达目的地' : '寻路已停止');
		return;
	}
	if (!status.active && nextState.path.length) status = { active: false, message: '' };
	notify();
});
