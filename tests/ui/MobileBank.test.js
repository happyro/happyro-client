import {beforeEach,it,expect,vi} from 'vitest';
const s=vi.hoisted(()=>({session:{AID:42,Playing:true,zeny:100,Entity:{action:0,ACTION:{DIE:99}}},enabled:true,send:vi.fn()}));
vi.mock('Engine/SessionStorage.js',()=>({default:s.session}));
vi.mock('Core/Configs.js',()=>({default:{get:()=>s.enabled}}));
vi.mock('Network/NetworkManager.js',()=>({default:{sendPacket:s.send}}));
vi.mock('Network/PacketStructure.js',()=>({default:{CZ:new Proxy({}, {get:(t,k)=>t[k]||=(class{constructor(){this.packet=k;}})})}}));
import {openGameBank,updateGameBank,closeGameBank,requestGameBank} from '../../src/UI/Game/GameBank.js';
import {createBankPanel} from '../../src/UI/Mobile/game/BankPanel.js';
import {clearInteraction,interactionSnapshot} from '../../src/UI/Game/ServerInteraction.js';
beforeEach(()=>{vi.clearAllMocks();clearInteraction();s.session.Playing=true;s.session.zeny=100;s.enabled=true;});
it('checks exact amounts and both capacities, locks requests and adopts server balances on reply',()=>{
 const bank=openGameBank(1000);bank.setOperationGuard(()=>true);for(const amount of [-1,0,1.5,101])bank.submit('deposit',amount);expect(s.send).not.toHaveBeenCalled();bank.submit('deposit',20);bank.submit('deposit',20);expect(s.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({packet:'REQ_BANKING_DEPOSIT',AID:42,money:20}));expect(bank.snapshot()).toMatchObject({wallet:100,balance:1000,pending:true});updateGameBank({money:1020,zeny:80,reason:0});expect(bank.snapshot()).toMatchObject({wallet:80,balance:1020,pending:false});s.session.zeny=2147483640;bank.submit('withdraw',8);expect(s.send).toHaveBeenCalledOnce();bank.submit('withdraw',7);expect(s.send).toHaveBeenLastCalledWith(expect.objectContaining({packet:'REQ_BANKING_WITHDRAW',money:7}));
});
it('handles rejection, close once, stale models and disabled or disconnected requests',()=>{
 const bank=openGameBank(0);bank.setOperationGuard(()=>true);bank.submit('deposit',1);updateGameBank({money:0,zeny:100,reason:2});expect(bank.snapshot().message).toContain('拒绝');bank.close();bank.close();expect(s.send.mock.calls.filter(([p])=>p.packet==='REQ_BANK_CLOSE')).toHaveLength(1);expect(interactionSnapshot()).toBeNull();bank.submit('deposit',1);s.enabled=false;expect(requestGameBank(()=>true)).toContain('未启用');s.enabled=true;s.session.Playing=false;requestGameBank(()=>true);expect(s.send).toHaveBeenCalledTimes(2);closeGameBank();
});
it('reviews an amount, rechecks a changed wallet and preserves a draft during balance updates',()=>{
 const bank=openGameBank(50);bank.setOperationGuard(()=>true);const body=document.createElement('div'),panel=createBankPanel(body,bank);const input=body.querySelector('[data-amount]');input.value='50';panel.update();expect(input.value).toBe('50');body.querySelector('[data-action="deposit"]').click();expect(s.send).not.toHaveBeenCalled();s.session.zeny=40;body.querySelector('[data-confirm]').click();expect(s.send).not.toHaveBeenCalled();expect(body.querySelector('[role=status]').textContent).toContain('金额');
});
