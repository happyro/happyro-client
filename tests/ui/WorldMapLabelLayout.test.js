import { describe, expect, it } from 'vitest';
import { chooseDungeonLabelOffset } from '../../src/UI/Components/WorldMap/WorldMapLabelLayout.js';

const rect = (left, top, width = 80, height = 19) => ({
	left,
	right: left + width,
	top,
	bottom: top + height,
	width,
	height
});

describe('world map dungeon label layout', () => {
	it('keeps a label at its authored position when it does not collide', () => {
		expect(chooseDungeonLabelOffset(rect(20, 40), rect(0, 0, 300, 200), [])).toBe(0);
	});

	it('moves a colliding label upward by its height and the required gap', () => {
		expect(chooseDungeonLabelOffset(rect(70, 80), rect(0, 0, 300, 200), [rect(20, 80)])).toBe(-23);
	});

	it('moves downward when the upward candidate would leave the map', () => {
		expect(chooseDungeonLabelOffset(rect(70, 2), rect(0, 0, 300, 200), [rect(20, 2)])).toBe(23);
	});

	it('keeps the authored position when no candidate can avoid all collisions', () => {
		const blockers = [rect(20, 80), rect(20, 57), rect(20, 103), rect(20, 34), rect(20, 126)];
		expect(chooseDungeonLabelOffset(rect(70, 80), rect(0, 0, 300, 200), blockers)).toBe(0);
	});
});
