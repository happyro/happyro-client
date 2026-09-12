export function fittedMapRect(canvasWidth, canvasHeight, sourceWidth, sourceHeight) {
	const srcW = Number(sourceWidth) || 0;
	const srcH = Number(sourceHeight) || 0;
	if (!canvasWidth || !canvasHeight || !srcW || !srcH) {
		return { x: 0, y: 0, width: canvasWidth || 0, height: canvasHeight || 0 };
	}
	const scale = Math.min(canvasWidth / srcW, canvasHeight / srcH);
	const width = srcW * scale;
	const height = srcH * scale;
	return {
		x: (canvasWidth - width) / 2,
		y: (canvasHeight - height) / 2,
		width,
		height
	};
}

export function mapImageSourceRect(imageWidth, imageHeight, grid) {
	const width = Number(grid?.width) || 0;
	const height = Number(grid?.height) || 0;
	if (!imageWidth || !imageHeight || !width || !height) {
		return { x: 0, y: 0, width: imageWidth || 0, height: imageHeight || 0 };
	}
	const max = Math.max(width, height);
	return {
		x: ((max - width) / 2 / max) * imageWidth,
		y: ((max - height) / 2 / max) * imageHeight,
		width: (width / max) * imageWidth,
		height: (height / max) * imageHeight
	};
}

export function mapPointToCanvas(fit, grid, point) {
	if (!fit?.width || !fit?.height || !grid?.width || !grid?.height || !point) return null;
	return {
		x: fit.x + (point.x / grid.width) * fit.width,
		y: fit.y + ((grid.height - point.y) / grid.height) * fit.height
	};
}

export function canvasPointToMap(fit, grid, canvasX, canvasY) {
	if (!fit?.width || !fit?.height || !grid?.width || !grid?.height) return { x: 0, y: 0 };
	const x = Math.floor(((canvasX - fit.x) / fit.width) * grid.width);
	const y = Math.floor(grid.height - ((canvasY - fit.y) / fit.height) * grid.height);
	return {
		x: Math.max(0, Math.min(grid.width - 1, x)),
		y: Math.max(0, Math.min(grid.height - 1, y))
	};
}

export function syncMapPreviewCanvas(canvas) {
	if (!canvas) return false;
	const displayWidth = canvas.clientWidth;
	const displayHeight = canvas.clientHeight;
	if (!displayWidth || !displayHeight) return false;
	const width = Math.max(1, Math.round(displayWidth));
	const height = Math.max(1, Math.round(displayHeight));
	if (canvas.width === width && canvas.height === height) return false;
	canvas.width = width;
	canvas.height = height;
	return true;
}
