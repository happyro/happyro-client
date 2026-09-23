import Entity from 'Renderer/Entity/Entity.js';
import SpriteRenderer from 'Renderer/SpriteRenderer.js';

/** Render the same game sprites and palettes used by the selected character. */
export function createAppearancePreviews() {
	let entries = [];
	let nextFrame = 0;
	return {
		update(root, { race, gender, hair, color }) {
			const canvases = [
				...root.querySelectorAll(`#${race}_${gender} .hair-preview`),
				...root.querySelectorAll('.color-preview')
			];
			entries = canvases.map(canvas => {
				const entity = new Entity();
				entity.set({
					job: race === 'human' ? 0 : 4218, sex: gender === 'male' ? 1 : 0,
					head: canvas.dataset.hair ? Number(canvas.dataset.hair) : hair,
					headpalette: canvas.dataset.color !== undefined ? Number(canvas.dataset.color) : color,
					action: 0, direction: 4
				});
				entity.hideShadow = true;
				return { entity, ctx: canvas.getContext('2d') };
			});
			nextFrame = 0;
		},
		render() {
			const now = performance.now();
			if (now < nextFrame) return;
			nextFrame = now + 150;
			for (const { entity, ctx } of entries) {
				ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
				// Human sprites are taller; move their feet below the portrait crop.
				SpriteRenderer.bind2DContext(ctx, 32, entity.job === 4218 ? 95 : 115);
				entity.renderEntity();
			}
		}
	};
}
