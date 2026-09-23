/** Each control owns one pointer; releasing a button never releases the joystick. */
export function bindPointerControls(root, scene, actions) {
	const abort = new AbortController();
	const joystick = root.querySelector('.joystick');
	const skills = [...root.querySelectorAll('[data-shortcut]')];
	const knob = joystick.querySelector('span');
	const owners = new Map();
	let vector = [0, 0],
		timer,
		sceneStart;
	const listen = (node, type, fn) => node.addEventListener(type, fn, { signal: abort.signal });
	const moving = () => vector[0] !== 0 || vector[1] !== 0;
	function tick() {
		if (!actions.enabled()) {
			cancel();
			return;
		}
		if (moving()) actions.move(...vector);
	}
	function update(event) {
		const rect = joystick.getBoundingClientRect(),
			radius = rect.width * 0.3;
		let x = event.clientX - rect.left - rect.width / 2;
		let y = event.clientY - rect.top - rect.height / 2;
		const distance = Math.hypot(x, y);
		if (distance > radius) {
			x *= radius / distance;
			y *= radius / distance;
		}
		knob.style.transform = `translate(${x}px, ${y}px)`;
		vector =
			distance < radius * 0.2 ? [0, 0] : [x / Math.max(1, Math.hypot(x, y)), -y / Math.max(1, Math.hypot(x, y))];
	}
	function release(node) {
		const id = owners.get(node);
		if (id === undefined) return;
		owners.delete(node);
		if (node.hasPointerCapture(id)) node.releasePointerCapture(id);
		node.classList.remove('held');
		if (!owners.size) {
			clearInterval(timer);
			timer = null;
		}
		if (node === joystick) {
			vector = [0, 0];
			knob.style.transform = '';
			actions.stopMove();
		}
	}
	function cancel() {
		release(joystick);
		for (const skill of skills) release(skill);
		if (sceneStart && scene.hasPointerCapture(sceneStart.id)) scene.releasePointerCapture(sceneStart.id);
		sceneStart = null;
	}
	for (const node of [joystick, ...skills]) {
		listen(node, 'pointerdown', event => {
			event.preventDefault();
			if (!actions.enabled() || owners.has(node) || event.button !== 0) return;
			owners.set(node, event.pointerId);
			node.setPointerCapture(event.pointerId);
			node.classList.add('held');
			if (node === joystick) {
				actions.startMove?.();
				actions.stopMove();
				update(event);
				tick();
			}
			if (!timer) timer = setInterval(tick, 200);
		});
		listen(node, 'pointermove', event => {
			if (node === joystick && owners.get(node) === event.pointerId) update(event);
		});
		for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
			listen(node, type, event => {
				if (owners.get(node) !== event.pointerId) return;
				const rect = node.getBoundingClientRect();
				const activate =
					skills.includes(node) &&
					type === 'pointerup' &&
					actions.enabled() &&
					event.clientX >= rect.left &&
					event.clientX <= rect.right &&
					event.clientY >= rect.top &&
					event.clientY <= rect.bottom;
				release(node);
				if (activate) actions.shortcut(Number(node.dataset.shortcut));
			});
	}
	const oldTouchAction = scene.style.touchAction;
	scene.style.touchAction = 'none';
	// Suppress legacy touch and synthesized mouse paths only on the game canvas.
	for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'mousedown', 'mouseup', 'contextmenu'])
		listen(scene, type, event => {
			event.preventDefault();
			event.stopPropagation();
		});
	listen(scene, 'pointerdown', event => {
		if (!actions.enabled() || owners.size || sceneStart || event.button !== 0) return;
		sceneStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
		scene.setPointerCapture(event.pointerId);
	});
	listen(scene, 'pointermove', event => {
		if (
			sceneStart?.id === event.pointerId &&
			Math.hypot(event.clientX - sceneStart.x, event.clientY - sceneStart.y) > 12
		)
			sceneStart.cancelled = true;
	});
	listen(scene, 'pointerup', event => {
		if (sceneStart?.id !== event.pointerId) return;
		const start = sceneStart;
		sceneStart = null;
		if (scene.hasPointerCapture(event.pointerId)) scene.releasePointerCapture(event.pointerId);
		if (!start.cancelled && actions.enabled() && !owners.size) actions.tap(event.clientX, event.clientY);
	});
	for (const type of ['pointercancel', 'lostpointercapture'])
		listen(scene, type, event => {
			if (sceneStart?.id === event.pointerId) sceneStart = null;
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
