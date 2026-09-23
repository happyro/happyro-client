import { expect, it, vi } from 'vitest';

it('locks browser zoom and page movement while preserving native scrolling and game touches', async () => {
	vi.resetModules();
	const styles = [document.documentElement.style.cssText, document.body.style.cssText];
	const listeners = [];
	const add = vi.spyOn(document, 'addEventListener').mockImplementation((type, handler) => listeners.push([type, handler]));
	const windowAdd = vi.spyOn(window, 'addEventListener').mockImplementation(() => {});
	const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
	vi.stubGlobal('scrollY', 120);
	try {
		const { lockMobileViewport } = await import('../../src/UI/Mobile/Viewport.js');
		lockMobileViewport();
		expect(document.body.style.position).toBe('fixed');
		expect(document.documentElement.style.overflow).toBe('hidden');
		expect(document.querySelector('meta[name=viewport]').content).toContain('user-scalable=no');
		expect(scroll).toHaveBeenCalledWith(0, 0);
		const count = listeners.length;
		lockMobileViewport();
		expect(listeners).toHaveLength(count);
		for (const [type, handler] of listeners) {
			const event = { cancelable: true, preventDefault: vi.fn(), stopPropagation: vi.fn(), touches: [{}], ctrlKey: false };
			handler(event);
			if (type.startsWith('gesture')) expect(event.preventDefault).toHaveBeenCalledOnce();
			else expect(event.preventDefault).not.toHaveBeenCalled();
			event.preventDefault.mockClear();
			event.touches.push({});
			event.ctrlKey = true;
			handler(event);
			expect(event.preventDefault).toHaveBeenCalledOnce();
			expect(event.stopPropagation).not.toHaveBeenCalled();
		}
	} finally {
		add.mockRestore(); windowAdd.mockRestore(); scroll.mockRestore(); vi.unstubAllGlobals();
		document.querySelector('meta[name=viewport]')?.remove();
		[document.documentElement.style.cssText, document.body.style.cssText] = styles;
	}
});
