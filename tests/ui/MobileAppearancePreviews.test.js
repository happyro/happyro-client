import { expect, it, vi } from 'vitest';
vi.mock('Renderer/Entity/Entity.js', () => ({ default: class {
	set(data) { Object.assign(this, data); }
	renderEntity = vi.fn();
} }));
vi.mock('Renderer/SpriteRenderer.js', () => ({ default: { bind2DContext: vi.fn() } }));
import { createAppearancePreviews } from '../../src/UI/Mobile/auth/AppearancePreviews.js';
import Entity from 'Renderer/Entity/Entity.js';
import SpriteRenderer from 'Renderer/SpriteRenderer.js';

it('renders the active race and gender with each actual hairstyle and palette', () => {
	const root = document.createElement('div');
	root.innerHTML = '<div id="human_male"><canvas class="hair-preview" data-hair="2"></canvas></div><div id="doram_female"><canvas class="hair-preview" data-hair="5"></canvas></div><canvas class="color-preview" data-color="8"></canvas>';
	const ctx = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () { return { canvas: this, clearRect: vi.fn() }; });
	const set = vi.spyOn(Entity.prototype, 'set');
	try {
		const previews = createAppearancePreviews();
		previews.update(root, { race: 'human', gender: 'male', hair: 3, color: 4 });
		expect(set.mock.calls.map(([data]) => [data.job, data.sex, data.head, data.headpalette])).toEqual([[0, 1, 2, 4], [0, 1, 3, 8]]);
		previews.render();
		expect(SpriteRenderer.bind2DContext).toHaveBeenCalledTimes(2);
		set.mockClear();
		previews.update(root, { race: 'doram', gender: 'female', hair: 6, color: 1 });
		expect(set.mock.calls.map(([data]) => [data.job, data.sex, data.head, data.headpalette])).toEqual([[4218, 0, 5, 1], [4218, 0, 6, 8]]);
		previews.render();
		expect(SpriteRenderer.bind2DContext).toHaveBeenCalledTimes(4);
	} finally { ctx.mockRestore(); set.mockRestore(); }
});
