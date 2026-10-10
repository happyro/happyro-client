import { beforeEach, expect, it, vi } from 'vitest';
const s = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('Network/NetworkManager.js', () => ({ default: { sendPacket: s.send } }));
vi.mock('Renderer/EntityManager.js', () => ({ default: { get: id => id === 7 ? { display: { name: '卡普拉服务人员#test' } } : null } }));
vi.mock('DB/DBManager.js', () => ({ default: { getNpcName: name => name } }));
vi.mock('Core/Client.js', () => ({ default: { loadFile: vi.fn() } }));
vi.mock('Network/PacketStructure.js', () => ({ default: {
 CZ: Object.fromEntries(['CLOSE_DIALOG', 'CHOOSE_MENU', 'INPUT_EDITDLGSTR', 'INPUT_EDITDLG', 'REQ_NEXT_SCRIPT', 'ACK_SELECT_DEALTYPE'].map(type => [type, class { constructor() { this.typeName = type; } }])),
 ZC: { OPEN_EDITDLGSTR: class {} }
} }));
import PACKET from 'Network/PacketStructure.js';
import Client from 'Core/Client.js';
import { mobileNPC } from '../../src/Engine/MapEngine/MobileNPC.js';
import { clearInteraction, interactionSnapshot, showInteraction } from '../../src/UI/Game/ServerInteraction.js';
beforeEach(() => { clearInteraction(); vi.clearAllMocks(); });
it('advances once, rejects obsolete callbacks and replaces the previous page after next', () => {
 mobileNPC.message({ NAID: 7, msg: '第一行' }); mobileNPC.message({ NAID: 7, msg: '第二行' });
 mobileNPC.next({ NAID: 7 }); const page = interactionSnapshot();
 expect(page.lines).toEqual(['第一行', '第二行']); page.respond(); page.respond();
 expect(s.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ typeName: 'REQ_NEXT_SCRIPT', NAID: 7 }));
 mobileNPC.message({ NAID: 7, msg: '下一页' }); expect(interactionSnapshot().lines).toEqual(['下一页']);
 page.close(); expect(interactionSnapshot()).not.toBeNull();
});
it('keeps protocol forms open until an explicit response instead of inventing cancellation values', () => {
 for (const pkt of [{ NAID: 7 }, Object.assign(new PACKET.ZC.OPEN_EDITDLGSTR(), { NAID: 7 })]) {
  s.send.mockClear(); mobileNPC.input(pkt); interactionSnapshot().close();
  expect(s.send).not.toHaveBeenCalled();
  expect(interactionSnapshot().canClose).toBe(false);
 }
});
it('checks integer boundaries and menu identity before sending responses', () => {
 mobileNPC.input({ NAID: 7 }); const form = interactionSnapshot();
 for (const value of ['', '1.5', '2147483648', '-2147483649']) expect(form.respond(value)).toBe('请输入有效的整数');
 expect(s.send).not.toHaveBeenCalled(); form.respond('-2');
 expect(s.send).toHaveBeenLastCalledWith(expect.objectContaining({ value: -2, NAID: 7 }));
 mobileNPC.menu({ NAID: 7, msg: '购买:离开' }); const menu = interactionSnapshot();
 menu.respond(3); expect(s.send).toHaveBeenCalledTimes(1); menu.respond(2);
 expect(s.send).toHaveBeenLastCalledWith(expect.objectContaining({ num: 2, NAID: 7 }));
});
it('ignores close packets belonging to another NPC', () => {
 mobileNPC.message({ NAID: 7, msg: '对话' }); mobileNPC.closeScript({ NAID: 8 });
 expect(interactionSnapshot().id).toBe(7); mobileNPC.closeScript({ NAID: 7 }); expect(interactionSnapshot()).toBeNull();
});

it('cancels menus with the protocol cancel option and closes only a final dialog', () => {
 mobileNPC.menu({ NAID: 7, msg: '选项' }); interactionSnapshot().close();
 expect(s.send).toHaveBeenLastCalledWith(expect.objectContaining({ typeName: 'CHOOSE_MENU', NAID: 7, num: 255 }));
 expect(interactionSnapshot()).toBeNull();
 mobileNPC.message({ NAID: 7, msg: '结束' }); mobileNPC.closeButton({ NAID: 7 }); interactionSnapshot().close();
 expect(s.send).toHaveBeenLastCalledWith(expect.objectContaining({ typeName: 'CLOSE_DIALOG', NAID: 7 }));
});

it('handles cutins arriving before text and rejects old image loads after closing or replacement', () => {
 const callbacks=[]; Client.loadFile.mockImplementation((file,fn)=>callbacks.push(fn));
 mobileNPC.cutin({imageName:'first',type:2});mobileNPC.message({NAID:7,msg:'对话'});callbacks[0]('first.bmp');expect(interactionSnapshot().image).toBe('first.bmp');
 const token=interactionSnapshot().token;mobileNPC.cutin({imageName:'second',type:2});expect(interactionSnapshot().token).toBe(token);
 clearInteraction();callbacks[1]('second.bmp');expect(interactionSnapshot()).toBeNull();
 mobileNPC.message({NAID:8,msg:'新对话'});expect(interactionSnapshot().image).toBe('');
});

it('does not let the old NPC cleanup close packet replace a newly opened warehouse or shop', () => {
 for (const kind of ['storage', 'shop']) {
  showInteraction({ kind, token: {}, title: '新窗口' }); const state = interactionSnapshot();
  mobileNPC.closeButton({ NAID: 7 }); expect(interactionSnapshot()).toBe(state);
 }
 clearInteraction(); mobileNPC.closeButton({ NAID: 7 }); expect(interactionSnapshot()).toBeNull();
});

it('uses the NPC display name for both conversations and shop selection', () => {
 mobileNPC.message({ NAID: 7, msg: '你好' }); expect(interactionSnapshot().title).toBe('卡普拉服务人员');
 mobileNPC.deal({ NAID: 7 }); expect(interactionSnapshot().title).toBe('卡普拉服务人员');
});

it('preserves script formatting for the NPC renderer',()=>{mobileNPC.message({NAID:7,msg:'<b>碳酸水</b>^2ECCFA清爽^000000'});expect(interactionSnapshot().lines).toEqual(['<b>碳酸水</b>^2ECCFA清爽^000000']);});

it.each([false,true])('clears the previous page before a direct menu and rejects late portrait loads (loaded=%s)', loaded => {
 const callbacks=[];Client.loadFile.mockImplementation((file,done)=>callbacks.push(done));
 mobileNPC.cutin({imageName:'kafra_01',type:2});
 mobileNPC.message({NAID:7,msg:'欢迎使用卡普拉服务。'});
 if(loaded)callbacks[0]('kafra.bmp');
 mobileNPC.next({NAID:7});interactionSnapshot().respond();
 expect(interactionSnapshot()).toMatchObject({lines:[],image:'',mode:'waiting'});
 mobileNPC.menu({NAID:7,msg:'保存位置:使用仓库:取消'});
 callbacks[0]('kafra.bmp');
 expect(interactionSnapshot()).toMatchObject({lines:[],image:'',mode:'menu'});
 expect(interactionSnapshot().options).toHaveLength(3);
 interactionSnapshot().respond(2);
 expect(s.send).toHaveBeenLastCalledWith(expect.objectContaining({typeName:'CHOOSE_MENU',num:2,NAID:7}));
});

it('keeps new page instructions and newly requested portraits after next', () => {
 mobileNPC.message({NAID:7,msg:'上一页'});mobileNPC.next({NAID:7});interactionSnapshot().respond();
 mobileNPC.message({NAID:7,msg:'请选择目的地：'});
 Client.loadFile.mockImplementation((file,done)=>done('new.bmp'));
 mobileNPC.cutin({imageName:'new',type:2});
 mobileNPC.menu({NAID:7,msg:'普隆德拉:艾尔贝塔'});
 expect(interactionSnapshot()).toMatchObject({lines:['请选择目的地：'],image:'new.bmp',mode:'menu'});
});

it('does not restore a late card illustration after the dialogue closes', () => {
 const pending = [];
 Client.loadFile.mockImplementation((file, done, failed) => pending.push({ file, done, failed }));
 mobileNPC.message({ NAID: 7, msg: '研究委托' });
 mobileNPC.cutin({ imageName: '캐럿카드', type: 3 });
 pending[0].failed();
 expect(pending[1].file).toContain('cardbmp/캐럿카드.bmp');
 mobileNPC.closeScript({ NAID: 7 });
 pending[1].done('late-card.bmp');
 expect(interactionSnapshot()).toBeNull();
 mobileNPC.message({ NAID: 7, msg: '新对话' });
 expect(interactionSnapshot().image).toBe('');
});
