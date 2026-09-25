import { MOVE_REPEAT_MS, MOVE_TURN_MS } from 'Controls/MovementTiming.js';

/** A left-side canvas drag owns movement; each skill keeps its own pointer. */
export function bindPointerControls(root, scene, actions) {
	const abort = new AbortController();
	const skills = [...root.querySelectorAll('[data-shortcut]')];
	const owners = new Map();
	let vector = [0, 0],
		timer,
		pendingMove,
		lastMoveAt = -Infinity,
		lastVector = [0, 0],
		sceneStart;
	const listen = (node, type, fn) => node.addEventListener(type, fn, { signal: abort.signal });
	const moving = () => vector[0] !== 0 || vector[1] !== 0;
	function tick() {
		if (!actions.enabled()) {
			cancel();
			return;
		}
		if (moving()) requestMove();
	}
	function clearPendingMove() {
		clearTimeout(pendingMove);
		pendingMove = null;
	}
	function sendMove() {
		clearPendingMove();
		if (!actions.enabled()) {
			cancel();
			return;
		}
		if (!moving()) return;
		lastMoveAt = performance.now();
		lastVector = vector;
		actions.move(...vector);
	}
	function requestMove() {
		const wait = MOVE_TURN_MS - (performance.now() - lastMoveAt);
		if (wait <= 0) sendMove();
		else if (pendingMove == null) pendingMove = setTimeout(sendMove, wait);
	}
	function startTimer() {
		if (!timer) timer = setInterval(tick, MOVE_REPEAT_MS);
	}
	function clearIdleTimer() {
		if (!owners.size && !sceneStart) {
			clearInterval(timer);
			timer = null;
		}
	}
	function update(event) {
		const wasMoving = moving();
		const x = event.clientX - sceneStart.x,
			y = event.clientY - sceneStart.y;
		const distance = Math.hypot(x, y);
		vector = distance < 8 ? [0, 0] : [x / distance, -y / distance];
		if (!moving()) {
			clearPendingMove();
			lastMoveAt = -Infinity;
			if (wasMoving) actions.stopMove();
		} else if (!wasMoving) {
			actions.startMove();
			sendMove();
		} else if (vector[0] * lastVector[0] + vector[1] * lastVector[1] < Math.cos(Math.PI / 36)) {
			// Accumulate small changes against the last sent direction, filtering hand jitter.
			requestMove();
		}
	}
	function releaseSkill(node) {
		const id = owners.get(node);
		if (id === undefined) return;
		owners.delete(node);
		if (node.hasPointerCapture(id)) node.releasePointerCapture(id);
		node.classList.remove('held');
		clearIdleTimer();
	}
	function releaseScene() {
		const start = sceneStart;
		sceneStart = null;
		if (start && scene.hasPointerCapture(start.id)) scene.releasePointerCapture(start.id);
		vector = [0, 0];
		clearPendingMove();
		lastMoveAt = -Infinity;
		if (start?.dragging) actions.stopMove();
		clearIdleTimer();
		return start;
	}
	function cancel() {
		releaseScene();
		for (const skill of skills) releaseSkill(skill);
	}
	for (const node of skills) {
		listen(node, 'pointerdown', event => {
			event.preventDefault();
			if (!actions.enabled() || owners.has(node) || event.button !== 0) return;
			owners.set(node, event.pointerId);
			node.setPointerCapture(event.pointerId);
			node.classList.add('held');
			startTimer();
		});
		for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
			listen(node, type, event => {
				if (owners.get(node) !== event.pointerId) return;
				const rect = node.getBoundingClientRect();
				const activate =
					type === 'pointerup' &&
					actions.enabled() &&
					event.clientX >= rect.left &&
					event.clientX <= rect.right &&
					event.clientY >= rect.top &&
					event.clientY <= rect.bottom;
				releaseSkill(node);
				if (activate) actions.shortcut(Number(node.dataset.shortcut));
			});
	}
	const oldTouchAction = scene.style.touchAction;
	scene.style.touchAction = 'none';
	for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'mousedown', 'mouseup', 'contextmenu'])
		listen(scene, type, event => {
			event.preventDefault();
			event.stopPropagation();
		});
	listen(scene, 'pointerdown', event => {
		if (!actions.enabled() || sceneStart || event.button !== 0) return;
		const rect = scene.getBoundingClientRect();
		// Target taps stay unobstructed; a left-side drag can still take over movement.
		const left = event.clientX < rect.left + rect.width / 2;
		if (!left && owners.size) return;
		sceneStart = { id: event.pointerId, x: event.clientX, y: event.clientY, left, cancelled: owners.size > 0 };
		scene.setPointerCapture(event.pointerId);
		startTimer();
	});
	listen(scene, 'pointermove', event => {
		if (sceneStart?.id !== event.pointerId) return;
		if (!actions.enabled()) {
			cancel();
			return;
		}
		const distance = Math.hypot(event.clientX - sceneStart.x, event.clientY - sceneStart.y);
		if (!sceneStart.left) {
			if (distance > 12) sceneStart.cancelled = true;
			return;
		}
		if (!sceneStart.dragging && distance >= 8) {
			sceneStart.dragging = true;
			sceneStart.cancelled = true;
			update(event);
		} else if (sceneStart.dragging) update(event);
	});
	listen(scene, 'pointerup', event => {
		if (sceneStart?.id !== event.pointerId) return;
		const start = releaseScene();
		if (!start.cancelled && actions.enabled() && !owners.size) actions.tap(event.clientX, event.clientY);
	});
	for (const type of ['pointercancel', 'lostpointercapture'])
		listen(scene, type, event => {
			if (sceneStart?.id === event.pointerId) releaseScene();
		});
	return {
		cancel,
		isMoving: moving,
		destroy() {
			cancel();
			abort.abort();
			scene.style.touchAction = oldTouchAction;
		}
	};
}
