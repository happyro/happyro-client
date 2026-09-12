import { describe, expect, it } from 'vitest';
import {
	canvasPointToMap,
	fittedMapRect,
	mapImageSourceRect,
	mapPointToCanvas
} from '../../src/UI/Components/GameTools/MapPreviewLayout.js';

describe('map preview layout', () => {
	it('contains a rectangular map in a landscape pane and letterboxes the sides', () => {
		const fit = fittedMapRect(400, 300, 312, 392);
		expect(fit.y).toBe(0);
		expect(fit.height).toBe(300);
		expect(fit.width).toBeCloseTo((312 / 392) * 300);
		expect(fit.x).toBeCloseTo((400 - fit.width) / 2);
	});

	it('crops official square minimaps to the gat playable area', () => {
		const source = mapImageSourceRect(512, 512, { width: 312, height: 392 });
		expect(source.y).toBe(0);
		expect(source.height).toBe(512);
		expect(source.width).toBeCloseTo((312 / 392) * 512);
		expect(source.x).toBeCloseTo((512 - source.width) / 2);
	});

	it('maps gat coordinates onto the contained image, not the letterbox', () => {
		const grid = { width: 312, height: 392 };
		const fit = fittedMapRect(400, 300, grid.width, grid.height);
		const center = mapPointToCanvas(fit, grid, { x: 156, y: 196 });
		expect(center.x).toBeCloseTo(200);
		expect(center.y).toBeCloseTo(150);
		expect(canvasPointToMap(fit, grid, center.x, center.y)).toEqual({ x: 156, y: 196 });
	});
});
