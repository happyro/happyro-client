import DB from 'DB/DBManager.js';
import Client from 'Core/Client.js';
import Entity from 'Renderer/Entity/Entity.js';
import SpriteRenderer from 'Renderer/SpriteRenderer.js';

/** A static preview uses the same sprite/action and origin as the desktop cart picker. */
export function loadCartPreview(id, callback) {
	const path = DB.getCartPath(id);
	Client.loadFiles([`${path}.spr`, `${path}.act`], (spr, act) => {
		const animations = act?.actions?.[0]?.animations;
		if (!spr || !animations?.length) return;
		const canvas = document.createElement('canvas');
		canvas.width = 100;
		canvas.height = 100;
		const context = canvas.getContext('2d'),
			entity = new Entity();
		SpriteRenderer.bind2DContext(context, canvas.width / 2, canvas.height + 10);
		for (const layer of animations[(animations.length / 2) | 0].layers)
			entity.renderLayer(layer, spr, spr, 1, [0, 0], false);
		callback(canvas.toDataURL());
	});
}
