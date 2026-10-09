/** Immediate camera controls, independent of settings drafts. */
export function createCameraPanel(body, adjustCamera) {
	const camera = document.createElement('div');
	camera.className = 'camera-section';
	body.replaceChildren(camera);
	const cameraButton = (label, action) => {
		const button = document.createElement('button');
		button.type = 'button';
		button.textContent = label;
		button.onclick = () => adjustCamera(action);
		return button;
	};
	const reset = cameraButton('重置镜头', 'reset');
	reset.className = 'camera-reset';
	camera.append(reset);
	for (const [name, actions] of [
		[
			'旋转',
			[
				['左转', 'left'],
				['右转', 'right']
			]
		],
		[
			'缩放',
			[
				['拉近', 'zoomIn'],
				['拉远', 'zoomOut']
			]
		],
		[
			'高度',
			[
				['抬高', 'up'],
				['降低', 'down']
			]
		]
	]) {
		const group = document.createElement('div');
		group.className = 'camera-group';
		group.setAttribute('role', 'group');
		group.setAttribute('aria-label', name);
		const controls = document.createElement('div');
		controls.className = 'camera-controls';
		for (const [label, action] of actions) controls.append(cameraButton(label, action));
		group.append(controls);
		camera.append(group);
	}
}
