import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const platform=vi.hoisted(()=>({isMobile:false}));
vi.mock('UI/Platform.js',()=>({default:platform}));
vi.mock('UI/GUIComponent.js',()=>({default:class{
 constructor(name,css){this.css=css;this.root=document.createElement('div');this._host=this.root;}
 placeOnTop=vi.fn();
 getRoot(){return this.root;}
 append(){this.root.innerHTML=this.render();document.body.replaceChildren(this.root);this.init();this.__active=true;this.onAppend();}
 remove(){this.onRemove();this.root.remove();this.__active=false;}
}}));
vi.mock('UI/UIManager.js',()=>({default:{addComponent:v=>v}}));
const loadFile=vi.hoisted(()=>vi.fn());
vi.mock('Core/Client.js',()=>({default:{loadFile}}));
vi.mock('DB/DBManager.js',()=>({default:{getItemName:()=>'<item>',getItemInfo:()=>({identifiedResourceName:'identified',unidentifiedResourceName:'unidentified'}),INTERFACE_PATH:'interface/'}}));
vi.mock('UI/InputFreeze.js',()=>({acquireInputFreeze:vi.fn(),releaseInputFreeze:vi.fn()}));
import view,{showGuildStorageLog} from '../../src/UI/Components/GuildStorageLog/GuildStorageLog.js';
it('paginates latest records and safely displays names, closes and resets',()=>{
 showGuildStorageLog({result:1,items:Array.from({length:21},(_,i)=>({name:'<script>',itemId:501,amount:i+1,refine:0,action:i%2,time:'2026-10-29'}))});
 expect(document.querySelector('section').dataset.layout).toBe('desktop');
 expect(document.querySelector('.desktop-window-header')).not.toBeNull();
 expect(view.placeOnTop).toHaveBeenCalled();expect(view.needFocus).toBe(false);expect(view.nativeScrolling).toBe(true);
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

it('keeps the mobile header and full-width container independently of desktop styling',()=>{
 platform.isMobile=true;
 showGuildStorageLog({result:2,items:[]});
 expect(document.querySelector('section').dataset.layout).toBe('mobile');
 expect(document.querySelector('.desktop-window-header')).toBeNull();
 expect(document.querySelector('[data-close]').textContent).toBe('关闭');
 view.remove();platform.isMobile=false;
});

it('updates mobile layout on rotation without resetting pagination and removes its resize listener',()=>{
 platform.isMobile=true;
 const remove=vi.spyOn(window,'removeEventListener');
 const width=window.innerWidth,height=window.innerHeight;
 window.innerWidth=390;window.innerHeight=844;
 showGuildStorageLog({result:1,items:Array.from({length:21},()=>({itemId:501,amount:1,name:'成员',time:'2026-10-29'}))});
 expect(view._host.dataset.orientation).toBe('portrait');
 expect(document.activeElement).toBe(document.querySelector('section'));
 document.querySelector('[data-next]').click();
 window.innerWidth=844;window.innerHeight=390;window.dispatchEvent(new Event('resize'));
 expect(view._host.dataset.orientation).toBe('landscape');
 expect(document.querySelector('[data-page]').textContent).toBe('2 / 2');
 view.remove();expect(remove).toHaveBeenCalledWith('resize',expect.any(Function));
 remove.mockRestore();window.innerWidth=width;window.innerHeight=height;platform.isMobile=false;
});

it('loads identified and unidentified icons without painting a different page after a delayed response',()=>{
 loadFile.mockClear();
 showGuildStorageLog({result:1,items:Array.from({length:21},(_,i)=>({itemId:501,IsIdentified:i%2,amount:1,name:'成员',time:'2026-10-29'}))});
 expect(loadFile.mock.calls[0][0]).toBe('interface/item/unidentified.bmp');
 expect(loadFile.mock.calls[1][0]).toBe('interface/item/identified.bmp');
 const oldIcon=document.querySelector('.item-icon');
 const late=loadFile.mock.calls[0][1];
 loadFile.mock.calls[1][1]('blob:loaded');
 expect(document.querySelectorAll('.item-icon')[1].style.backgroundImage).toContain('blob:loaded');
 document.querySelector('[data-next]').click();late('blob:old');
 expect(oldIcon.style.backgroundImage).toBe('');
 expect(document.querySelector('.item-icon').style.backgroundImage).toBe('');
 view.remove();
});
