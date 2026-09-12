import { onConnectionEnd } from './ConnectionLifecycle.js';

const skills = new Map();
const listeners = new Set();
let globalEnd = 0;
const now = () => performance.now();

export function remainingCooldown(id, time = now()) {
	return Math.max(0, (skills.get(id) || 0) - time, globalEnd - time);
}

export function setSkillCooldown(id, milliseconds, time = now()) {
	if (milliseconds > 0) skills.set(id, time + milliseconds);
	else skills.delete(id);
	for (const listener of listeners) listener(id);
}

export function setGlobalCooldown(milliseconds, time = now()) {
	globalEnd = time + Math.max(0, milliseconds);
	for (const listener of listeners) listener(null);
}

export function subscribeCooldowns(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function clearCooldowns() {
	skills.clear();
	globalEnd = 0;
	for (const listener of listeners) listener(null);
}
onConnectionEnd(clearCooldowns);
