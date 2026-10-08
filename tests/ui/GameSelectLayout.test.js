import { afterEach, expect, it, vi } from 'vitest';
import { mountGameSelect, renderGameSelect, setGameSelectOptions } from '../../src/UI/Components/GameTools/GameSelect.js';

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
 expect(menu.style.top).toBe('173px');expect(menu.style.maxHeight).toBe('197px');
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
