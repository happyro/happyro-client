import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
 session: { Playing: true, Entity: { hasCart: true, clevel: 41, action: 0, ACTION: { DIE: 99 } } },
 send: vi.fn(), preview: vi.fn()
}));
vi.mock('Engine/SessionStorage.js', () => ({ default: state.session }));
vi.mock('Network/NetworkManager.js', () => ({ default: { sendPacket: state.send } }));
vi.mock('Network/PacketStructure.js', () => ({ default: { CZ: {
 REQ_CHANGECART: class {}, SELECTCART: class {}
} } }));
vi.mock('UI/Mobile/game/CartPreview.js', () => ({ loadCartPreview: state.preview }));
vi.mock('UI/Components/Inventory/Inventory.js', () => ({ default: { getUI: () => ({list: []}) } }));
vi.mock('UI/Game/GameInventory.js', () => ({ createGameInventory: () => ({}) }));
vi.mock('DB/DBManager.js', () => ({default: {
 getMessage: id => `标签${id}`, getMonsterName: () => '^FF0000波利^000000'
} }));
vi.mock('Core/Client.js', () => ({default: {}}));
vi.mock('DB/Skills/SkillInfo.generated.js', () => ({default: {}}));
import { openCartAppearance } from '../../src/UI/Game/GameCartAppearance.js';
import { openMonsterInformation } from '../../src/UI/Game/GameMonsterInformation.js';
import { interactionSnapshot, clearInteraction } from '../../src/UI/Game/ServerInteraction.js';
beforeEach(() => {
 clearInteraction();vi.clearAllMocks();state.session.Entity.hasCart=true;state.session.Entity.clevel=41;
});
it('filters cart level boundaries, previews resources and rechecks cart ownership before sending', () => {
 const service=openCartAppearance();service.setOperationGuard(()=>true);
 expect(service.snapshot().entries.map(e=>e.id)).toEqual([1,2]);
 expect(state.preview).toHaveBeenCalledTimes(2);
 state.session.Entity.hasCart=false;expect(service.choose(2)).toContain('失效');expect(state.send).not.toHaveBeenCalled();
 state.session.Entity.hasCart=true;state.session.Entity.clevel=40;expect(service.choose(2)).toContain('失效');
 expect(service.choose(1)).toBe('');expect(state.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({num:1}));
 service.choose(1);expect(state.send).toHaveBeenCalledOnce();
});
it('uses the advertised decorative choices and identity, and does not send a selection on close', () => {
 let service=openCartAppearance({identity:78,typeList:[11,11,99]});service.setOperationGuard(()=>true);
 expect(service.snapshot().entries.map(e=>e.id)).toEqual([11]);
 interactionSnapshot().close();expect(state.send).not.toHaveBeenCalled();
 service=openCartAppearance({identity:79,typeList:[12]});service.setOperationGuard(()=>true);service.choose(12);
 expect(state.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({identity:79,type:12}));
});
it('shows every sensed statistic and elemental multiplier without a gameplay request or stale close', () => {
 const packet={job:1002,level:1,size:0,raceType:3,hp:50,def:2,mdefPower:1,property:1,
 propertyTable:{water:25,earth:100,fire:50,wind:175,poison:100,saint:100,dark:100,mental:100,undead:100}};
 openMonsterInformation(packet);const old=interactionSnapshot();
 expect(old.rows).toContainEqual(['名称','波利']);expect(old.rows).toContainEqual(['标签418属性倍率','175%']);expect(old.rows).toHaveLength(17);
 openMonsterInformation({...packet,hp:100});old.close();expect(interactionSnapshot().rows).toContainEqual(['HP',100]);
 interactionSnapshot().close();expect(interactionSnapshot()).toBeNull();expect(state.send).not.toHaveBeenCalled();
});
