import { describe, expect, it } from 'vitest';
import {
	remainingPathFromPosition,
	selectAutoWalkWaypoint
} from '../../src/UI/Components/Navigation/NavigationAutoWalk.js';

describe('navigation auto-walk', () => {
	it('selects a short waypoint ahead of the nearest path cell', () => {
		const path = Array.from({ length: 30 }, (_, x) => ({ x, y: 10 }));

		expect(selectAutoWalkWaypoint(path, { x: 5, y: 11 })).toEqual({ x: 17, y: 10 });
	});

	it('stops at the final path cell when fewer than 12 cells remain', () => {
		const path = Array.from({ length: 10 }, (_, x) => ({ x, y: 10 }));

		expect(selectAutoWalkWaypoint(path, { x: 5, y: 10 })).toEqual({ x: 9, y: 10 });
	});

	it('returns null until a path is available', () => {
		expect(selectAutoWalkWaypoint([], { x: 5, y: 10 })).toBeNull();
	});

	it('drops already walked cells from the remaining path', () => {
		const path = Array.from({ length: 10 }, (_, x) => ({ x, y: 10 }));
		expect(remainingPathFromPosition(path, { x: 4, y: 10 }).map(point => point.x)).toEqual([4, 5, 6, 7, 8, 9]);
	});
});
