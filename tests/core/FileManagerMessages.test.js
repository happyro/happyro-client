import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('Core/FileSystem.js', () => ({ default: { getFile: vi.fn(), saveFile: vi.fn() } }));
import FileSystem from 'Core/FileSystem.js';
import FileManager from 'Core/FileManager.js';

describe('remote message translation freshness', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		FileManager.remoteClient = 'https://example.test/';
		FileManager.gameFiles = [];
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
			ok: true,
			headers: new Headers({ 'Content-Type': 'text/plain' }),
			arrayBuffer: async () => new TextEncoder().encode('获得基础经验：%d#').buffer
		}));
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		FileManager.remoteClient = '';
	});
	it.each(['data/msgstringtable.txt', 'data\\msgstringtable.csv'])(
		'loads fresh translations even when an old saved copy exists: %s', async filename => {
			FileSystem.getFile.mockImplementation(() => { throw new Error('stale saved copy was read'); });
			const bytes = await new Promise(resolve => FileManager.get(filename, resolve));
			expect(new TextDecoder().decode(bytes)).toBe('获得基础经验：%d#');
			expect(FileSystem.getFile).not.toHaveBeenCalled();
			expect(fetch).toHaveBeenCalledWith(
				'https://example.test/' + filename.replace(/\\/g, '/'), { cache: 'no-store' }
			);
		}
	);
	it('keeps ordinary assets on the existing local lookup path', () => {
		FileSystem.getFile.mockImplementation(() => {});
		FileManager.get('data/sprite/example.spr', vi.fn());
		expect(FileSystem.getFile).toHaveBeenCalled();
		expect(fetch).not.toHaveBeenCalled();
	});
	it('preserves local message tables when no remote client is configured', () => {
		FileManager.remoteClient = '';
		FileSystem.getFile.mockImplementation(() => {});
		FileManager.get('data/msgstringtable.txt', vi.fn());
		expect(FileSystem.getFile).toHaveBeenCalled();
		expect(fetch).not.toHaveBeenCalled();
	});
});
