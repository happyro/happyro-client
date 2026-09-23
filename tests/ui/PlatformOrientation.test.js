import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

it('keeps physical portrait orientation while the keyboard shrinks the viewport', async () => {
	const orientation = Object.assign(new EventTarget(), { type: 'portrait-primary' });
	vi.stubGlobal('screen', { width: 390, height: 844, orientation });
	vi.stubGlobal('matchMedia', () => ({ matches: true }));
	const { default: platform } = await import('../../src/UI/Platform.js');
	const changed = vi.fn();
	const unsubscribe = platform.onOrientationChange(changed);
	vi.stubGlobal('innerWidth', 390);
	vi.stubGlobal('innerHeight', 280);
	window.dispatchEvent(new Event('resize'));
	expect(platform.orientation).toBe('portrait');
	expect(changed).not.toHaveBeenCalled();
	orientation.type = 'landscape-primary';
	orientation.dispatchEvent(new Event('change'));
	expect(platform.orientation).toBe('landscape');
	expect(changed).toHaveBeenCalledExactlyOnceWith('landscape');
	unsubscribe();
});
