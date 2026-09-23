import Session from 'Engine/SessionStorage.js';
import EntityManager from 'Renderer/EntityManager.js';
import Network from 'Network/NetworkManager.js';
import Events from 'Core/Events.js';

const pending = new WeakMap();

export function cancelCompanionSkill(entity) {
	const action = entity && pending.get(entity);
	if (!action) return;
	if (entity.onWalkEnd === action.onEnd) entity.onWalkEnd = action.previous;
	pending.delete(entity);
}

// Companion movement must never queue a skill on the player's walk callback.
export function queueCompanionSkill(entity, packet, destination, validate) {
	cancelCompanionSkill(entity);
	const owner = Session.Entity;
	const action = { previous: entity.onWalkEnd };
	const valid = () =>
		pending.get(entity) === action &&
		Boolean(owner) &&
		Session.Playing &&
		!Session.FreezeUI &&
		Session.Entity === owner &&
		owner.action !== owner.ACTION.DIE &&
		EntityManager.get(entity.GID) === entity &&
		(entity.GID === Session.homunId || entity.GID === Session.mercId) &&
		entity.action !== entity.ACTION.DIE &&
		entity.remove_tick === 0 &&
		Math.round(entity.position[0]) === destination[0] &&
		Math.round(entity.position[1]) === destination[1] &&
		validate();
	action.onEnd = function () {
		if (entity.onWalkEnd === action.onEnd) entity.onWalkEnd = action.previous;
		action.previous?.call(entity);
		if (!valid()) {
			if (pending.get(entity) === action) pending.delete(entity);
			return;
		}
		// Use the same server-position settling delay as the player path.
		Events.setTimeout(() => {
			const send = valid();
			if (pending.get(entity) === action) pending.delete(entity);
			if (send) Network.sendPacket(packet);
		}, 50);
	};
	pending.set(entity, action);
	entity.onWalkEnd = action.onEnd;
}
