import Client from 'Core/Client.js';
import Emotions from 'DB/Emotions.js';
import Entity from 'Renderer/Entity/Entity.js';
import SpriteRenderer from 'Renderer/SpriteRenderer.js';
import { chatEmotions } from './ChatEmotions.js';

let images;
/** Render the same original sprite layers used by the RO expression window. */
export function loadChatEmotionImages() {
	if (!images) {
		const load = extension =>
			new Promise((resolve, reject) =>
				Client.loadFile(`data/sprite/\xc0\xcc\xc6\xd1\xc6\xae/emotion.${extension}`, resolve, reject)
			);
		images = Promise.all([load('act'), load('spr')])
			.then(([action, sprite]) => {
				const entity = new Entity();
				return Object.fromEntries(
					chatEmotions.map(([command]) => {
						const frame = Emotions.indexes[Emotions.commands[command]];
						const animations = action.actions[frame].animations;
						const layers = animations[Math.floor(animations.length / 5)].layers;
						const canvas = document.createElement('canvas');
						canvas.width = canvas.height = 40;
						SpriteRenderer.bind2DContext(
							canvas.getContext('2d'),
							20 - layers[0].pos[0],
							40 - layers[0].pos[1]
						);
						for (const layer of layers) entity.renderLayer(layer, sprite, sprite, 1, [0, 0], false);
						return [command, canvas.toDataURL('image/png')];
					})
				);
			})
			.catch(error => {
				images = null;
				throw error;
			});
	}
	return images;
}
