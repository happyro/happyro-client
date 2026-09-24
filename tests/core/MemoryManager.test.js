import { afterEach, beforeEach, expect, it, vi } from 'vitest';

let memory;
beforeEach(async () => {
	vi.resetModules();
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(1000);
	vi.stubGlobal('requestIdleCallback', undefined);
	memory = (await import('../../src/Core/MemoryManager.js')).default;
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('cleans over successive frames without requestIdleCallback and rechecks recently used entries', () => {
	for (let i = 0; i < 8; i++) memory.set(`${i}.txt`, new Uint8Array([1]));
	vi.setSystemTime(40000);
	memory.clean(null, Date.now());
	expect(memory.search(/./)).toHaveLength(3);
	memory.get('6.txt');
	memory.clean(null, Date.now());
	expect(memory.search(/./)).toEqual(['6.txt']);
	vi.setSystemTime(80000);
	memory.clean(null, Date.now());
	expect(memory.search(/./)).toEqual([]);
});

it('continues cleanup after a release throws instead of latching into a permanent busy state', () => {
	memory.set('broken.spr', { texture: {} });
	memory.set('next.txt', new Uint8Array([1]));
	vi.setSystemTime(40000);
	expect(() => memory.clean({ isTexture() { throw new Error('lost context'); } }, Date.now())).toThrow('lost context');
	memory.clean(null, Date.now());
	expect(memory.exist('next.txt')).toBe(false);
	vi.setSystemTime(80000);
	memory.clean(null, Date.now());
	expect(memory.search(/./)).toEqual([]);
});

it('yields when the time budget is consumed even before the entry limit', () => {
	for (let i = 0; i < 4; i++) memory.set(`${i}.txt`, new Uint8Array([1]));
	vi.setSystemTime(40000);
	vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(3);
	memory.clean(null, Date.now());
	expect(memory.search(/./)).toHaveLength(3);
});
