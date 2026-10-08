import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mountGameSelect, renderGameSelect, setGameSelectOptions } from '../../src/UI/Components/GameTools/GameSelect.js';

let resizeCallbacks;
beforeEach(() => { resizeCallbacks=[];vi.stubGlobal('ResizeObserver',class {constructor(callback){resizeCallbacks.push(callback);}observe(){}disconnect(){}}); });
const choices = [{value:'a',label:'A'},{value:'b',label:'B'}];
afterEach(() => vi.unstubAllGlobals());
function mount() {
 const visual=new EventTarget();Object.assign(visual,{width:844,height:390,offsetTop:0,offsetLeft:0});vi.stubGlobal('visualViewport',visual);
 document.body.innerHTML=`<section class="mobile-menu-window"><div>${renderGameSelect({ariaLabel:'类型',options:choices,value:'a'})}</div></section>`;
 const panel=document.querySelector('section'),root=panel.querySelector('.game-select'),menu=root.querySelector('.game-select-menu'),trigger=root.querySelector('button');
 panel.getBoundingClientRect=()=>({left:16,right:828,top:12,bottom:378,width:812,height:366});
 trigger.getBoundingClientRect=()=>({left:30,right:230,top:143,bottom:171,width:200,height:28});
 menu.getBoundingClientRect=()=>({width:200,height:Math.min(226,parseFloat(menu.style.maxHeight)||226)});
 const control=mountGameSelect(root);
 return {root,panel,menu,trigger,visual,control};
}
it('fits a long list below the trigger instead of flipping outside a short window',()=>{
 const {menu,trigger,control}=mount();trigger.click();
 expect(menu.style.top).toBe('173px');expect(menu.style.maxHeight).toBe('209px');
 expect(menu.hasAttribute('data-test-popover-open')).toBe(true);control.close();
});
it('closes on visual viewport panning and still supports selection after reopening',()=>{
 const {root,menu,trigger,visual}=mount();trigger.click();visual.dispatchEvent(new Event('scroll'));
 expect(menu.hidden).toBe(true);expect(menu.hasAttribute('data-test-popover-open')).toBe(false);
 trigger.click();root.querySelector('[data-value="b"]').click();
 expect(root.querySelector('input').value).toBe('b');expect(menu.hidden).toBe(true);
});
it('keeps option scrolling open but closes when its containing page scrolls',()=>{
 const {panel,menu,trigger}=mount();trigger.click();menu.dispatchEvent(new Event('scroll'));
 expect(menu.hidden).toBe(false);panel.dispatchEvent(new Event('scroll'));expect(menu.hidden).toBe(true);
});
it('releases the top layer when options update or the owner is removed',async()=>{
 const {root,panel,menu,trigger}=mount();trigger.click();setGameSelectOptions(root,{options:choices});
 expect(menu.hasAttribute('data-test-popover-open')).toBe(false);
 trigger.click();panel.remove();await Promise.resolve();
 expect(menu.hidden).toBe(true);expect(menu.hasAttribute('data-test-popover-open')).toBe(false);
});
it('supports keyboard selection and opens upwards near the bottom edge',()=>{
 const {root,menu,trigger}=mount();trigger.getBoundingClientRect=()=>({left:30,right:230,top:330,bottom:358,width:200,height:28});
 trigger.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));
 expect(menu.style.top).toBe('102px');expect(document.activeElement.dataset.value).toBe('b');
 root.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));expect(menu.hidden).toBe(true);
});

it('anchors a second select to its own trigger and follows deferred layout changes', () => {
 const first=mount();first.trigger.click();
 const other=document.createElement('div');other.innerHTML=renderGameSelect({ariaLabel:'第二',options:choices,value:'a'});first.panel.append(other);
 const root=other.firstElementChild,menu=root.querySelector('.game-select-menu'),trigger=root.querySelector('button');
 let left=300,top=200;
 trigger.getBoundingClientRect=()=>({left,right:left+120,top,bottom:top+28,width:120,height:28});
 menu.getBoundingClientRect=()=>({width:120,height:80});
 const control=mountGameSelect(root);trigger.click();
 expect(first.menu.hidden).toBe(true);expect(menu.style.left).toBe('300px');expect(menu.style.top).toBe('118px');
 left=420;top=220;resizeCallbacks.at(-1)();
 expect(menu.style.left).toBe('420px');expect(menu.style.top).toBe('138px');
 control.close();top=100;trigger.click();expect(menu.style.top).toBe('130px');control.close();
});

it('lets a dialog dropdown extend down into the viewport instead of clipping it to the dialog', () => {
 const {panel,root,menu,trigger,visual,control}=mount();
 Object.assign(visual,{width:1024,height:768});
 const dialog=document.createElement('dialog');panel.append(dialog);dialog.append(root);
 dialog.getBoundingClientRect=()=>({left:300,right:720,top:290,bottom:450,width:420,height:160});
 trigger.getBoundingClientRect=()=>({left:320,right:520,top:330,bottom:374,width:200,height:44});
 trigger.click();expect(menu.style.top).toBe('376px');expect(menu.style.maxHeight).toBe('360px');
 expect(parseFloat(menu.style.top)+226).toBeGreaterThan(450);control.close();
});
