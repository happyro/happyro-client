import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ isMobile: true, orientation: 'portrait', change: null }));
vi.mock('UI/Platform.js', () => ({ default: {
	get isMobile() { return state.isMobile; },
	get orientation() { return state.orientation; },
	onOrientationChange: callback => { state.change = callback; return () => { state.change = null; }; }
} }));
import Guard from '../../src/UI/RotationGuard.js';
import { endConnection } from '../../src/Network/ConnectionLifecycle.js';

afterEach(() => { Guard.release(); state.isMobile = true; state.orientation = 'portrait'; });
function rotate(value) { state.orientation = value; state.change?.(); }

describe('game-only landscape requirement', () => {
	it('waits before entering, continues once, and blocks portrait play without reconnecting', () => {
		const enter = vi.fn();
		expect(document.getElementById('ro-rotation-guard')).toBeNull();
		Guard.requireLandscape(enter);
		expect(enter).not.toHaveBeenCalled();
		expect(document.getElementById('ro-rotation-guard').hidden).toBe(false);
		rotate('landscape');
		expect(enter).toHaveBeenCalledOnce();
		expect(document.getElementById('ro-rotation-guard').hidden).toBe(true);
		endConnection(); // Normal char -> map connection handoff must keep the requirement.
		rotate('portrait');
		expect(document.getElementById('ro-rotation-guard').hidden).toBe(false);
		expect(document.querySelector('#ro-rotation-guard button').hidden).toBe(true);
		rotate('landscape');
		expect(enter).toHaveBeenCalledOnce();
		Guard.release();
		expect(document.getElementById('ro-rotation-guard')).toBeNull();
	});
	it('cancels waiting on back or disconnect without entering later', () => {
		const enter = vi.fn();
		Guard.requireLandscape(enter);
		document.querySelector('#ro-rotation-guard button').click();
		rotate('landscape');
		expect(enter).not.toHaveBeenCalled();
		rotate('portrait');
		Guard.requireLandscape(enter);
		endConnection();
		rotate('landscape');
		expect(enter).not.toHaveBeenCalled();
		expect(document.getElementById('ro-rotation-guard')).toBeNull();
	});
	it('enters immediately in landscape and leaves desktop unrestricted', () => {
		const enter = vi.fn();
		state.orientation = 'landscape';
		Guard.requireLandscape(enter);
		expect(enter).toHaveBeenCalledOnce();
		Guard.release();
		state.isMobile = false;
		state.orientation = 'portrait';
		Guard.requireLandscape(enter);
		expect(enter).toHaveBeenCalledTimes(2);
		expect(document.getElementById('ro-rotation-guard')).toBeNull();
	});
});
