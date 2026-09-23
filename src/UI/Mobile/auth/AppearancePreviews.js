import Client from 'Core/Client.js';
import DB from 'DB/DBManager.js';

const initialized = new WeakSet();

/** Use the center color of the desktop palette swatch, without its bitmap frame. */
export function loadAppearanceColors(root) {
	if (initialized.has(root)) return;
	initialized.add(root);
	for (const swatch of root.querySelectorAll('.color-swatch')) {
		const index = Number(swatch.dataset.color) + 1;
		Client.loadFile(`${DB.INTERFACE_PATH}make_character_ver2/color0${index}_off.bmp`, dataURI => {
			const image = new Image();
			image.onload = () => {
				const canvas = document.createElement('canvas');
				canvas.width = canvas.height = 1;
				const ctx = canvas.getContext('2d');
				ctx.drawImage(image, Math.floor(image.naturalWidth / 2), Math.floor(image.naturalHeight / 2), 1, 1, 0, 0, 1, 1);
				const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
				swatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
			};
			image.src = dataURI;
		});
	}
}
