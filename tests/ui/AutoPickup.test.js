import { beforeEach, expect, it, vi } from 'vitest';
import { createAutoPickupController } from '../../src/UI/Game/AutoPickupController.js';
import { pickupCategory, pickupDefaults, validPickupSettings, loadPickupSettings, savePickupSettings } from '../../src/UI/Game/PickupSettings.js';
import Session from '../../src/Engine/SessionStorage.js';
let io, time, settings, items, controller;
const item = (id, x, itemId = 501) => ({ id, itemId, position: [x, 0] });
beforeEach(() => {
 time = 0; settings = { ...pickupDefaults(), enabled: true }; items = [item(1, 4), item(2, 1)];
 io = { now: () => time, settings: () => settings, available: () => true, position: () => [0, 0], items: () => items,
  matches: () => true, reachable: () => true, busy: () => false, chasing: () => false, pick: vi.fn(), cancel: vi.fn() };
 controller = createAutoPickupController(io);
});
it('chooses the nearest matching item, then continues after its removal', () => {
 controller.tick(); expect(io.pick.mock.calls[0][0].id).toBe(2);
 items = [items[0]]; controller.tick(); controller.tick(); expect(io.pick.mock.calls[1][0].id).toBe(1);
});
it('filters range, category and exclusions without touching manual pickup', () => {
 settings.excluded = [{ id: 501, name: '药水' }]; items.push(item(3, 2, 502), item(4, 6, 503));
 io.matches = target => target.itemId !== 502; controller.tick(); expect(io.pick).not.toHaveBeenCalled();
 io.matches = () => true; controller.tick(); expect(io.pick.mock.calls[0][0].id).toBe(3);
});
it('holds a queued walk without issuing duplicate requests', () => {
 io.chasing = () => true; controller.tick(); time = 4000; controller.tick(); expect(io.pick).toHaveBeenCalledOnce();
});
it('backs off rejected or unreachable items and tries another target', () => {
 io.reachable = target => target.id !== 2; controller.tick(); expect(io.pick.mock.calls[0][0].id).toBe(1);
 time = 1000; controller.tick(); expect(io.cancel).toHaveBeenCalledOnce(); expect(io.pick).toHaveBeenCalledOnce();
 time = 6000; controller.tick(); expect(io.pick).toHaveBeenCalledTimes(2);
});
it('manual movement cancels queued pickup and waits for release and idle', () => {
 controller.tick(); controller.manual('move-start'); time = 2000; controller.tick(); expect(io.pick).toHaveBeenCalledOnce();
 controller.manual('move-end'); time = 3100; io.busy = () => true; controller.tick(); expect(io.pick).toHaveBeenCalledOnce();
 io.busy = () => false; controller.tick(); expect(io.pick).toHaveBeenCalledTimes(2);
});
it('disabling or leaving the map cancels only the automation target', () => {
 controller.tick(); settings.enabled = false; controller.tick(); expect(io.cancel).toHaveBeenCalledOnce();
 controller.destroy(); expect(io.cancel).toHaveBeenCalledOnce(); time = 10000; controller.tick(); expect(io.pick).toHaveBeenCalledOnce();
});
it('does not discriminate the source of dropped items', () => {
 items = [ { ...item(1, 1), source: 'self' }, { ...item(2, 2), source: 'other-player' } ];
 controller.tick(); expect(io.pick.mock.calls[0][0].id).toBe(1);
});
it('maps existing protocol item types and validates the whole settings draft', () => {
 expect(pickupCategory(5)).toBe('equipment'); expect(pickupCategory(0)).toBe('consumable');
 expect(pickupCategory(6)).toBe('card'); expect(pickupCategory(3)).toBe('other');
 expect(validPickupSettings(pickupDefaults())).toBe(true);
 expect(validPickupSettings({ ...pickupDefaults(), range: 0 })).toBe(false);
});
it('persists independent character preferences and returns isolated drafts', () => {
 Session.ServerName = 'pickup-test'; Session.AID = 12; Session.GID = 13;
 expect(savePickupSettings(settings)).toBe(true); const draft = loadPickupSettings(); draft.excluded.push({ id: 1, name: 'x' });
 expect(loadPickupSettings().excluded).toEqual([]);
 Session.GID = 14; expect(loadPickupSettings().enabled).toBe(false);
 Session.GID = 13; expect(loadPickupSettings().enabled).toBe(true);
});
it('validates the per-round pickup limit', () => {
 for (const batchSeconds of [0, 31, 1.5]) expect(validPickupSettings({ ...pickupDefaults(), batchSeconds })).toBe(false);
 expect(validPickupSettings({ ...pickupDefaults(), batchSeconds: 1 })).toBe(true);
});
