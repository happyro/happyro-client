import Altitude from 'Renderer/Map/Altitude.js';

function mapToCanvas(canvas, coordinateGrid, point) {
	return {
		x: (point.x / coordinateGrid.width) * canvas.width,
		y: ((coordinateGrid.height - point.y) / coordinateGrid.height) * canvas.height
	};
}

function drawMarker(context, canvas, marker, coordinateGrid) {
	if (!marker || !coordinateGrid?.width || !coordinateGrid?.height) return;
	const point = mapToCanvas(canvas, coordinateGrid, marker);
	context.beginPath();
	context.arc(point.x, point.y, 6, 0, Math.PI * 2);
	context.fillStyle = '#e3362d';
	context.fill();
	context.strokeStyle = '#fff';
	context.lineWidth = 2;
	context.stroke();
}

function drawPath(context, canvas, path, coordinateGrid) {
	if (!path?.length || !coordinateGrid?.width || !coordinateGrid?.height) return;
	context.save();
	context.beginPath();
	path.forEach((point, index) => {
		const position = mapToCanvas(canvas, coordinateGrid, point);
		if (index === 0) context.moveTo(position.x, position.y);
		else context.lineTo(position.x, position.y);
	});
	context.strokeStyle = '#29d8e8';
	context.lineWidth = 3;
	context.lineJoin = 'round';
	context.lineCap = 'round';
	context.shadowColor = 'rgba(0, 0, 0, 0.75)';
	context.shadowBlur = 2;
	context.stroke();
	context.restore();
}

function drawPlayer(context, canvas, player, coordinateGrid) {
	if (!player || !coordinateGrid?.width || !coordinateGrid?.height) return;
	const point = mapToCanvas(canvas, coordinateGrid, player);
	context.beginPath();
	context.arc(point.x, point.y, 6, 0, Math.PI * 2);
	context.fillStyle = '#2f80ed';
	context.fill();
	context.strokeStyle = '#fff';
	context.lineWidth = 2;
	context.stroke();
}

export function drawWalkableMapPreview(context, canvas, coordinateGrid) {
	if (!coordinateGrid?.cells || !coordinateGrid.width || !coordinateGrid.height) return false;
	const image = context.createImageData(canvas.width, canvas.height);
	for (let pixelY = 0; pixelY < canvas.height; pixelY += 1) {
		const mapY = coordinateGrid.height - 1 - Math.floor((pixelY / canvas.height) * coordinateGrid.height);
		for (let pixelX = 0; pixelX < canvas.width; pixelX += 1) {
			const mapX = Math.floor((pixelX / canvas.width) * coordinateGrid.width);
			const type = coordinateGrid.cells[(mapY * coordinateGrid.width + mapX) * 5 + 4];
			const offset = (pixelY * canvas.width + pixelX) * 4;
			if (type & Altitude.TYPE.WATER) {
				image.data[offset] = 65;
				image.data[offset + 1] = 125;
				image.data[offset + 2] = 153;
			} else if (type & Altitude.TYPE.WALKABLE) {
				image.data[offset] = 190;
				image.data[offset + 1] = 198;
				image.data[offset + 2] = 184;
			} else if (type & Altitude.TYPE.SNIPABLE) {
				image.data[offset] = 91;
				image.data[offset + 1] = 99;
				image.data[offset + 2] = 94;
			} else {
				image.data[offset] = 23;
				image.data[offset + 1] = 25;
				image.data[offset + 2] = 28;
			}
			image.data[offset + 3] = 255;
		}
	}
	context.putImageData(image, 0, 0);
	return true;
}

export function drawWorldMapPreview(canvas, imageSource, marker, coordinateGrid, overlays = {}) {
	const renderToken = (canvas._worldMapRenderToken || 0) + 1;
	canvas._worldMapRenderToken = renderToken;
	const context = canvas.getContext('2d');
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = '#17191c';
	context.fillRect(0, 0, canvas.width, canvas.height);
	const drawOverlays = () => {
		drawPath(context, canvas, overlays.path, coordinateGrid);
		drawMarker(context, canvas, marker, coordinateGrid);
		drawPlayer(context, canvas, overlays.player, coordinateGrid);
	};
	const drawFallback = () => {
		if (canvas._worldMapRenderToken !== renderToken) return;
		if (drawWalkableMapPreview(context, canvas, coordinateGrid)) {
			drawOverlays();
			return;
		}
		context.fillStyle = '#b9bec4';
		context.textAlign = 'center';
		context.fillText('暂无图片', canvas.width / 2, canvas.height / 2);
	};
	if (!imageSource) {
		drawFallback();
		return;
	}
	const image = new Image();
	image.decoding = 'async';
	image.onload = () => {
		if (canvas._worldMapRenderToken !== renderToken) return;
		context.drawImage(image, 0, 0, canvas.width, canvas.height);
		drawOverlays();
	};
	image.onerror = drawFallback;
	image.src = imageSource;
}
