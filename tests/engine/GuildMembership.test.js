import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { expect, it, vi } from 'vitest';
const source = readFileSync('src/Engine/MapEngine/Guild.js', 'utf8').replace(/\r\n/g, '\n');
function fixture(name, mobile = false) {
 const Guild = { hide: vi.fn(), resetSocialState: vi.fn(), removeSocialMember: vi.fn(), getSocialSnapshot:()=>({members:[{GID:2,CharName:"Other"}]}) };
 const Session = { GID:1, hasGuild: true, guildName: 'Old', isGuildMaster: true, guildRight: 17, Entity: { GUID: 123, display: { name: 'Self' } } };
 const GuildEngine = { guild_id: 123, requestGuildEmblem: vi.fn() };
 const fn = source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))[0];
 return { Guild, Session, GuildEngine, receive: vm.runInNewContext(`(${fn})`, {Guild,Session,GuildEngine,Platform:{isMobile:mobile},DB:{getMessage:()=>'%s'},ChatBox:{addText:vi.fn(),TYPE:{},FILTER:{}},GuildCompanion:{closeDisband:vi.fn()}}) };
}
for (const mobile of [false,true]) {
 for (const name of ['onGuildMemberLeave','onGuildMemberExpulsion']) {
  it(`${name} updates members and clears own membership on mobile=${mobile}`,()=>{
   const t=fixture(name,mobile);t.receive({GID:2,reasonDesc:''});expect(t.Guild.removeSocialMember).toHaveBeenCalledWith(2);expect(t.Session.hasGuild).toBe(true);
   t.receive({GID:1,reasonDesc:''});expect(t.Guild.resetSocialState).toHaveBeenCalledOnce();expect(t.Session.hasGuild).toBe(false);expect(t.GuildEngine.guild_id).toBe(0);expect(t.Session.Entity.GUID).toBe(0);
  });
 }
 it(`disband clears cached state on mobile=${mobile}`,()=>{const t=fixture('onGuildDestroy',mobile);t.receive({reason:0});expect(t.Guild.resetSocialState).toHaveBeenCalledOnce();expect(t.GuildEngine.guild_id).toBe(0);});
}
it('zero guild update clears membership rather than granting stale authority',()=>{const t=fixture('onGuildOwnInfo');t.receive({GDID:0,right:17,isMaster:1});expect(t.Session.hasGuild).toBe(false);expect(t.Session.isGuildMaster).toBe(false);expect(t.Session.guildRight).toBe(0);expect(t.Session.guildName).toBe('');});
it('guild information revokes the old master flag after transfer',()=>{
 const code=readFileSync('src/UI/Components/Guild/Guild.js','utf8').match(/Guild.updateSession = (function[^]*?\n\});/)[1];
 const Session={Entity:{display:{name:'Old master'}},isGuildMaster:true};
 const update=vm.runInNewContext(`(${code})`,{Session});update({GDID:7,masterName:'New master',guildname:'Guild'});expect(Session.isGuildMaster).toBe(false);
 update({GDID:7,masterName:'Old master',guildname:'Guild'});expect(Session.isGuildMaster).toBe(true);
});
it('emblem upload failures surface visible feedback instead of console-only errors',()=>{
 const method=source.match(/static sendEmblem\(data\) \{([^]*?)\n\t\}\n\}/)[1];
 let xhr;const showMessageBox=vi.fn();
 class Request{constructor(){xhr=this;}open(){}send(){}}
 const send=vm.runInNewContext(`(function(data){${method}\n})`,{PACKETVER:{value:20211103},Session:{Entity:{GUID:1},AID:2,ServerName:'Test',WebToken:'test'},FormData:class{append(){}},Blob:class{},XMLHttpRequest:Request,window:{location:{protocol:'http:'}},UIManager:{showMessageBox},console:{warn:vi.fn(),error:vi.fn()}});
 send(new Uint8Array([66,77]));xhr.status=403;xhr.onload();expect(showMessageBox.mock.lastCall[0]).toContain('上传失败');xhr.onerror();expect(showMessageBox.mock.lastCall[0]).toContain('连接中断');xhr.ontimeout();expect(showMessageBox.mock.lastCall[0]).toContain('上传超时');
});
it('desktop rank save excludes the current master and confirms leadership transfer',()=>{
 const src=readFileSync('src/UI/Components/Guild/Guild.js','utf8');
 const fn=src.match(/function onValidate\([^]*?\n\}/)[0];
 const _members=[{AID:1,GID:2,GPositionID:0},{AID:3,GID:4,GPositionID:5}];
 const Guild={onChangeMemberPosRequest:vi.fn()},Session={AID:1,GID:2,isGuildMaster:true};
 const showPromptBox=vi.fn();const root={querySelectorAll:()=>[{style:{display:'block'},classList:['content','members']}]};
 const save=vm.runInNewContext(`(${fn})`,{getActiveTab:()=>'members',setOkButtonVisible:()=>{},_root:()=>root,Guild,Session,_members,UIManager:{showPromptBox},getComputedStyle:()=>({display:'block'})});
 save();expect(Guild.onChangeMemberPosRequest.mock.lastCall[0]).toEqual([{AID:3,GID:4,positionID:5}]);
 _members[1].GPositionID=0;save();expect(Guild.onChangeMemberPosRequest).toHaveBeenCalledOnce();expect(showPromptBox.mock.lastCall[0]).toContain('转交会长');
 showPromptBox.mock.lastCall[3]();expect(Guild.onChangeMemberPosRequest.mock.lastCall[0]).toEqual([{AID:3,GID:4,positionID:0}]);
 Session.isGuildMaster=false;showPromptBox.mock.lastCall[3]();expect(Guild.onChangeMemberPosRequest).toHaveBeenCalledTimes(2);
});
it('desktop rank editor preserves and edits all three server permission bits',()=>{
 const src=readFileSync('src/UI/Components/Guild/Guild.js','utf8');
 const fn=src.match(/function onValidate\([^]*?\n\}/)[0];
 let enabled=new Set(['invite','storage']);
 const row={querySelector:selector=>selector==='.title input'?{value:'Member'}:selector==='.tax input'?{value:'0'}:{checked:enabled.has(selector.split(' ')[0].slice(1))}};
 const _positions=[{positionID:1,right:0x101,payRate:0,posName:'Old',ranking:1}];
 const Guild={onPositionUpdateRequest:vi.fn()};
 const save=vm.runInNewContext(`(${fn})`,{getActiveTab:()=>'positions',setOkButtonVisible:()=>{},_root:()=>({querySelectorAll:selector=>selector==='.content'?[{style:{display:'block'},classList:['content','positions']}]:[row]}),getComputedStyle:()=>({display:'block'}),Guild,Session:{isGuildMaster:true},_positions});
 save();expect(Guild.onPositionUpdateRequest.mock.lastCall[0][0].right).toBe(0x101);
 enabled=new Set(['punish']);save();expect(Guild.onPositionUpdateRequest.mock.lastCall[0][0].right).toBe(0x10);
 enabled=new Set(['invite','punish','storage']);save();expect(Guild.onPositionUpdateRequest.mock.lastCall[0][0].right).toBe(0x111);
});
it('authoritative own guild updates grant and revoke online permissions',()=>{
 const t=fixture('onGuildOwnInfo');
 t.receive({GDID:7,right:0x101,isMaster:0});expect(t.Session.guildRight).toBe(0x101);
 t.receive({GDID:7,right:0,isMaster:0});expect(t.Session.guildRight).toBe(0);
});

it('opening desktop guild information also requests the total member roster',()=>{
 const src=readFileSync('src/UI/Components/Guild/Guild.js','utf8');
 const fn=src.match(/function onChangeTab\([^]*?\n\}/)[0];
 const Guild={onGuildInfoRequest:vi.fn()};
 const root={querySelectorAll:()=>[],querySelector:()=>null};
 const tab={className:'info',getAttribute:()=> '0',classList:{contains:()=>false,add:()=>{}}};
 const change=vm.runInNewContext(`(${fn})`,{Guild,_root:()=>root,Renderer:{render:()=>{},stop:()=>{}},renderMemberFaces:()=>{},setOkButtonVisible:()=>{},updateDisbandButton:()=>{}});
 change.call(tab,{});expect(Guild.onGuildInfoRequest.mock.calls.map(c=>c[0])).toEqual([0,1]);
});
