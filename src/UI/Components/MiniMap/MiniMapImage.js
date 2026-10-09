import Altitude from 'Renderer/Map/Altitude.js';

export function hasVisiblePixels(image) {
	const canvas = document.createElement('canvas');
	canvas.width = image.naturalWidth;
	canvas.height = image.naturalHeight;
	const context = canvas.getContext('2d', { willReadFrequently: true });
	context.drawImage(image, 0, 0);
	const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;

	for (let offset = 3; offset < pixels.length; offset += 4) {
		if (pixels[offset] !== 0) {
			return true;
		}
	}
	return false;
}

export function createAltitudeFallback() {
	const width = Altitude.width;
	const height = Altitude.height;
	if (!width || !height) {
		return null;
	}

	const size = 512;
	const max = Math.max(width, height);
	const scale = size / max;
	const offsetX = (max - width) / 2;
	const offsetY = (max - height) / 2;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const context = canvas.getContext('2d');
	const image = context.createImageData(size, size);
	const pixels = image.data;

	for (let pixelY = 0; pixelY < size; pixelY++) {
		const y = height - 1 - Math.floor(pixelY / scale - offsetY);
		if (y < 0 || y >= height) {
			continue;
		}

		for (let pixelX = 0; pixelX < size; pixelX++) {
			const x = Math.floor(pixelX / scale - offsetX);
			if (x < 0 || x >= width) {
				continue;
			}

			const type = Altitude.getCellType(x, y);
			const offset = (pixelX + pixelY * size) * 4;
			if (type & Altitude.TYPE.WATER) {
				pixels[offset] = 74;
				pixels[offset + 1] = 137;
				pixels[offset + 2] = 164;
				pixels[offset + 3] = 230;
			} else if (type & Altitude.TYPE.WALKABLE) {
				pixels[offset] = 205;
				pixels[offset + 1] = 211;
				pixels[offset + 2] = 198;
				pixels[offset + 3] = 230;
			} else if (type & Altitude.TYPE.SNIPABLE) {
				pixels[offset] = 105;
				pixels[offset + 1] = 113;
				pixels[offset + 2] = 108;
				pixels[offset + 3] = 190;
			}
		}
	}

	context.putImageData(image, 0, 0);
	return canvas;
}
