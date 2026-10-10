import Client from 'Core/Client.js';
import DB from 'DB/DBManager.js';

/** Load NPC portraits and the card illustrations used by Eden research quests. */
export function loadNPCIllustration(imageName, onload) {
	const filename = imageName.includes('.') ? imageName : `${imageName}.bmp`;
	Client.loadFile(`${DB.INTERFACE_PATH}illust/${filename}`, onload, () => {
		Client.loadFile(`${DB.INTERFACE_PATH}cardbmp/${filename}`, onload);
	});
}
