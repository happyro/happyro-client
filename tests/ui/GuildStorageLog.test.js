import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
vi.mock('UI/GUIComponent.js',()=>({default:class{
 constructor(){this.root=document.createElement('div');}
 getRoot(){return this.root;}
 append(){this.root.innerHTML=this.render();document.body.replaceChildren(this.root);this.init();this.__active=true;this.onAppend();}
 remove(){this.onRemove();this.root.remove();this.__active=false;}
}}));
vi.mock('DB/DBManager.js',()=>({default:{getItemName:()=>'<item>'}}));
vi.mock('UI/InputFreeze.js',()=>({acquireInputFreeze:vi.fn(),releaseInputFreeze:vi.fn()}));
import view,{showGuildStorageLog} from '../../src/UI/Components/GuildStorageLog/GuildStorageLog.js';
it('paginates latest records and safely displays names, closes and resets',()=>{
 showGuildStorageLog({result:1,items:Array.from({length:21},(_,i)=>({name:'<script>',itemId:501,amount:i+1,refine:0,action:i%2,time:'2026-10-29'}))});
 expect(document.querySelectorAll('article')).toHaveLength(20);expect(document.querySelector('script')).toBeNull();
 document.querySelector('[data-next]').click();expect(document.querySelectorAll('article')).toHaveLength(1);expect(document.querySelector('[data-page]').textContent).toBe('2 / 2');
 document.querySelector('[data-close]').click();expect(document.querySelector('section')).toBeNull();
 showGuildStorageLog({result:2,items:[]});expect(document.querySelector('.summary').textContent).toContain('暂无');
 showGuildStorageLog({result:3,items:[]});expect(document.querySelector('.summary').textContent).toContain('加载失败');view.remove();
});
it('parses current 32-bit item/card IDs and rejects truncated packets',()=>{
 const source=readFileSync('src/Network/PacketStructure.js','utf8');
 const code=source.match(/PACKET.ZC.ACK_GUILDSTORAGE_LOG = function[^]*?\n\};/)[0];
 const PACKET={ZC:{}};vm.runInNewContext(code,{PACKET});
 const values=[1,1,42,450177,7,1,9,123n,1,5,400001,0,0,0,'成员','2026-10-29',0];let n=0;
 const fp=new Proxy({tell:()=>8},{get:(t,k)=>t[k]||(()=>values[n++])});
 const p=new PACKET.ZC.ACK_GUILDSTORAGE_LOG(fp,101);expect(p.items[0]).toMatchObject({itemId:450177,amount:7,action:1,cards:[400001,0,0,0],name:'成员'});
 n=0;expect(()=>new PACKET.ZC.ACK_GUILDSTORAGE_LOG(fp,100)).toThrow('Invalid guild storage log length');
});
