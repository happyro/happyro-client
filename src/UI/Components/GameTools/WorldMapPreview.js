import Client from 'Core/Client.js';
import DB from 'DB/DBManager.js';
import Session from 'Engine/SessionStorage.js';
import Altitude from 'Renderer/Map/Altitude.js';
import { fittedMapRect, mapImageSourceRect, mapPointToCanvas, syncMapPreviewCanvas } from './MapPreviewLayout.js';

let playerArrow = null;
let playerArrowPromise = null;

function loadPlayerArrow() {
	if (playerArrow?.complete && playerArrow.width) return Promise.resolve(playerArrow);
	if (playerArrowPromise) return playerArrowPromise;
	playerArrow = new Image();
	playerArrow.decoding = 'async';
	playerArrowPromise = new Promise(resolve => {
		Client.loadFile(`${DB.INTERFACE_PATH}map/map_arrow.bmp`, dataURI => {
			if (!dataURI) {
				playerArrowPromise = null;
				resolve(null);
				return;
			}
			playerArrow.onload = () => resolve(playerArrow);
			playerArrow.onerror = () => {
				playerArrowPromise = null;
				resolve(null);
			};
			playerArrow.src = dataURI;
		});
	});
	return playerArrowPromise;
}

export const NPC_MARKER_COLOR = '#2f80ed';

function previewFit(canvas, coordinateGrid, sourceWidth, sourceHeight) {
	const width = coordinateGrid?.width || sourceWidth || canvas.width;
	const height = coordinateGrid?.height || sourceHeight || canvas.height;
	canvas._mapFitRect = fittedMapRect(canvas.width, canvas.height, width, height);
	return canvas._mapFitRect;
}

function mapToCanvas(canvas, coordinateGrid, point) {
	const fit =
		canvas._mapFitRect || fittedMapRect(canvas.width, canvas.height, coordinateGrid.width, coordinateGrid.height);
	return mapPointToCanvas(fit, coordinateGrid, point);
}

function drawDot(context, point, radius, fill) {
	if (!point) return;
	context.beginPath();
	context.arc(point.x, point.y, radius, 0, Math.PI * 2);
	context.fillStyle = fill;
	context.fill();
	context.strokeStyle = '#fff';
	context.lineWidth = 2;
	context.stroke();
}

function drawMarker(context, canvas, marker, coordinateGrid, color = NPC_MARKER_COLOR, radius = 6) {
	if (!marker || !coordinateGrid?.width || !coordinateGrid?.height) return;
	drawDot(context, mapToCanvas(canvas, coordinateGrid, marker), radius, color);
}

function drawNpcMarker(context, canvas, npc, coordinateGrid) {
	drawMarker(context, canvas, npc, coordinateGrid, NPC_MARKER_COLOR, 7);
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
	if (!point) return;
	if (!playerArrow?.complete || !playerArrow.width) return;
	const direction = Number.isFinite(player.direction) ? player.direction : (Session.Entity?.direction ?? 0);
	context.save();
	context.translate(point.x, point.y);
	context.rotate(((direction + 4) * 45 * Math.PI) / 180);
	context.drawImage(playerArrow, -playerArrow.width / 2, -playerArrow.height / 2);
	context.restore();
}

export function drawWalkableMapPreview(context, canvas, coordinateGrid, fit) {
	if (!coordinateGrid?.cells || !coordinateGrid.width || !coordinateGrid.height) return false;
	const mapFit = fit || fittedMapRect(canvas.width, canvas.height, coordinateGrid.width, coordinateGrid.height);
	const image = context.createImageData(canvas.width, canvas.height);
	for (let pixelY = 0; pixelY < canvas.height; pixelY += 1) {
		const mapY =
			coordinateGrid.height - 1 - Math.floor(((pixelY - mapFit.y) / mapFit.height) * coordinateGrid.height);
		for (let pixelX = 0; pixelX < canvas.width; pixelX += 1) {
			const mapX = Math.floor(((pixelX - mapFit.x) / mapFit.width) * coordinateGrid.width);
			const offset = (pixelY * canvas.width + pixelX) * 4;
			if (mapX < 0 || mapY < 0 || mapX >= coordinateGrid.width || mapY >= coordinateGrid.height) {
				image.data[offset] = 23;
				image.data[offset + 1] = 25;
				image.data[offset + 2] = 28;
				image.data[offset + 3] = 255;
				continue;
			}
			const type = coordinateGrid.cells[(mapY * coordinateGrid.width + mapX) * 5 + 4];
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
	syncMapPreviewCanvas(canvas);
	const context = canvas.getContext('2d');
	const fit = previewFit(canvas, coordinateGrid);
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = '#17191c';
	context.fillRect(0, 0, canvas.width, canvas.height);
	const drawOverlays = () => {
		drawPath(context, canvas, overlays.path, coordinateGrid);
		drawNpcMarker(context, canvas, overlays.selectedNpc, coordinateGrid);
		drawMarker(context, canvas, marker, coordinateGrid, NPC_MARKER_COLOR);
		if (!overlays.player) return;
		if (playerArrow?.complete && playerArrow.width) {
			drawPlayer(context, canvas, overlays.player, coordinateGrid);
			return;
		}
		loadPlayerArrow().then(arrow => {
			if (!arrow || canvas._worldMapRenderToken !== renderToken) return;
			drawPlayer(context, canvas, overlays.player, coordinateGrid);
		});
	};
	const drawFallback = () => {
		if (canvas._worldMapRenderToken !== renderToken) return;
		previewFit(canvas, coordinateGrid);
		if (drawWalkableMapPreview(context, canvas, coordinateGrid, canvas._mapFitRect)) {
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
		previewFit(canvas, coordinateGrid, image.naturalWidth, image.naturalHeight);
		const mapFit = canvas._mapFitRect;
		const source = mapImageSourceRect(image.naturalWidth, image.naturalHeight, coordinateGrid);
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.fillStyle = '#17191c';
		context.fillRect(0, 0, canvas.width, canvas.height);
		context.drawImage(
			image,
			source.x,
			source.y,
			source.width,
			source.height,
			mapFit.x,
			mapFit.y,
			mapFit.width,
			mapFit.height
		);
		drawOverlays();
	};
	image.onerror = drawFallback;
	image.src = imageSource;
}
