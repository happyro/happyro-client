import { expect, it, vi } from 'vitest';
vi.mock('UI/Components/GameTools/AdventureControlService.js', () => ({ searchAdventureItems: vi.fn() }));
import { searchAdventureItems } from '../../src/UI/Components/GameTools/AdventureControlService.js';
import { matchesPickupCategory } from '../../src/UI/Game/PickupCatalog.js';
it('all categories need no metadata requests', () => {
 expect(matchesPickupCategory({ itemId: 501 }, ['equipment', 'consumable', 'card', 'other'])).toBe(true);
 expect(searchAdventureItems).not.toHaveBeenCalled();
});
it('uses packet categories when available and resolves re-entered items from the catalog', async () => {
 expect(matchesPickupCategory({ itemId: 501, type: 0 }, ['consumable'])).toBe(true);
 searchAdventureItems.mockResolvedValueOnce({ data: [{ Id: 502, Type: 'Healing' }] });
 expect(matchesPickupCategory({ itemId: 502 }, ['consumable'])).toBe(false);
 await vi.waitFor(() => expect(matchesPickupCategory({ itemId: 502 }, ['consumable'])).toBe(true));
});
it('does not confuse pet eggs with armor in the wire protocol', async () => {
 searchAdventureItems.mockResolvedValueOnce({ data: [{ Id: 9001, Type: 'PetEgg' }] });
 expect(matchesPickupCategory({ itemId: 9001, type: 4 }, ['equipment'])).toBe(false);
 await vi.waitFor(() => expect(matchesPickupCategory({ itemId: 9001, type: 4 }, ['other'])).toBe(true));
});
