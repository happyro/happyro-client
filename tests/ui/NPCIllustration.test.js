import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('Core/Client.js', () => ({ default: { loadFile: vi.fn() } }));
vi.mock('DB/DBManager.js', () => ({ default: { INTERFACE_PATH: 'data/texture/유저인터페이스/' } }));
import Client from 'Core/Client.js';
import { loadNPCIllustration } from '../../src/Engine/MapEngine/NPCIllustration.js';

beforeEach(() => vi.resetAllMocks());
it('keeps existing portrait assets and explicit extensions', () => {
 const done = vi.fn();
 Client.loadFile.mockImplementation((path, loaded) => loaded('portrait'));
 loadNPCIllustration('min01.bmp', done);
 expect(Client.loadFile).toHaveBeenCalledTimes(1);
 expect(Client.loadFile.mock.calls[0][0]).toBe('data/texture/유저인터페이스/illust/min01.bmp');
 expect(done).toHaveBeenCalledWith('portrait');
});
it('loads the existing card artwork when the quest image is absent from illust', () => {
 const done = vi.fn();
 Client.loadFile.mockImplementationOnce((path, loaded, failed) => failed()).mockImplementationOnce((path, loaded) => loaded('card'));
 loadNPCIllustration('캐럿카드', done);
 expect(Client.loadFile.mock.calls.map(call => call[0])).toEqual([
  'data/texture/유저인터페이스/illust/캐럿카드.bmp',
  'data/texture/유저인터페이스/cardbmp/캐럿카드.bmp'
 ]);
 expect(done).toHaveBeenCalledExactlyOnceWith('card');
});
it('preserves the encoded resource name sent by older NPC scripts', () => {
 Client.loadFile.mockImplementationOnce((path, loaded, failed) => failed());
 loadNPCIllustration('°øÁßµô¸®ÅÍÄ«µå', vi.fn());
 expect(Client.loadFile.mock.calls[1][0]).toBe('data/texture/유저인터페이스/cardbmp/°øÁßµô¸®ÅÍÄ«µå.bmp');
});
