import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import Queue from '../../src/Utils/Queue.js';
const source = readFileSync('src/App/MapViewer.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export default MapViewer.init;', 'globalThis.viewer = MapViewer;').replace(/MapViewer\.init\(\);\s*$/, '');
function setup() {
 const events = [], Intro = { append: vi.fn(), remove: vi.fn() };
 const DB = { mapalias: { 'logical.rsw': 'physical.rsw' }, loadMapAliases: vi.fn() };
 const MapRenderer = { setMap: vi.fn(name => events.push(['map',name])) };
 const Thread = { hook: (_name, callback) => { Thread.ready = callback; }, init: () => Thread.ready(), send: vi.fn((type,data) => events.push([type,data])) };
 const UIManager = { showMessageBox: vi.fn() };
 const Client = { init: () => Client.onFilesLoaded(), search: vi.fn() };
 const context = { Queue, Configs: { get: () => false }, Client, Thread, BGM: { setAvailableExtensions: vi.fn() }, Session: {}, Renderer: { init: vi.fn() }, MapRenderer, Camera: {}, Altitude: {}, Entity: class {}, Mouse: {}, MapControl: { init: vi.fn() }, Intro, DB, UIManager, window: {} };
 vm.runInNewContext(source, context);context.viewer.init();Intro.onFilesSubmit([]);
 return { DB, MapRenderer, UIManager, events };
}
describe('standalone map viewer resource aliases', () => {
 it('waits for aliases and sends them to the worker before starting a map', () => {
  const { DB, MapRenderer, events } = setup();expect(MapRenderer.setMap).not.toHaveBeenCalled();
  DB.loadMapAliases.mock.calls[0][0]();
  expect(events).toEqual([['CLIENT_FILES_ALIAS', DB.mapalias], ['map','guild_vs4.rsw']]);
 });
 it('stops on a missing resource index and presents recoverable map errors', () => {
  const { DB, MapRenderer, UIManager } = setup();DB.loadMapAliases.mock.calls[0][1]();
  expect(MapRenderer.setMap).not.toHaveBeenCalled();expect(UIManager.showMessageBox).toHaveBeenCalledWith('无法加载地图资源索引，请重新打开查看器。','ok');
  DB.loadMapAliases.mock.calls[0][0]();MapRenderer.onError({message:'地图加载失败'});
  expect(UIManager.showMessageBox).toHaveBeenLastCalledWith('地图加载失败','ok');
 });
});
