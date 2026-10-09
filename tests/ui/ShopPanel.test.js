import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createShopPanel} from '../../src/UI/Mobile/game/ShopPanel.js';
let body,state,service,panel;
beforeEach(()=>{
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
 body=document.body.appendChild(document.createElement('div'));
 state={mode:'buy',currency:'Zeny',money:1000,total:20,allowed:true,items:[{index:0,ID:501,name:'红色药水',price:10,limit:10,quantity:2,description:'恢复 HP',materials:[]}]};
 service={snapshot:()=>structuredClone(state),set:vi.fn(()=>''),submit:vi.fn(()=>{state.pending=true;state.allowed=false;return '已提交，等待服务器回复';}),clear:vi.fn(()=>true)};
 panel=createShopPanel(body,service);
});
afterEach(()=>{document.body.replaceChildren();vi.restoreAllMocks();});
const click=text=>[...body.querySelectorAll('button')].find(el=>el.textContent===text).click();
it('refreshes stock limits without overwriting an in-progress quantity and marks selected items',()=>{
 body.querySelector('.inventory-item').click();const input=body.querySelector('input');input.value='8';state.items[0].limit=3;panel.update();
 expect(input.value).toBe('8');expect(input.max).toBe('3');expect(input.checkValidity()).toBe(false);expect(body.querySelector('.shop-price').textContent).toContain('上限：3');expect(body.querySelector('.inventory-item').getAttribute('aria-pressed')).toBe('true');
 state.items=[];panel.update();expect(body.querySelector('.inventory-item')).toBeNull();expect(body.querySelector('.shop-empty').hidden).toBe(false);expect(body.querySelector('.inventory-detail').textContent).toContain('变化');
});
it('reviews quantities, totals and materials then locks controls while awaiting the server',()=>{
 state.items[0].materials=[{name:'材料',amount:3,refine_level:5}];panel.update();click('核对订单');
 expect(body.querySelector('.shop-review').textContent).toContain('红色药水 × 2');expect(body.querySelector('.shop-review').textContent).toContain('精炼 +5');expect(body.querySelector('.shop-review').textContent).toContain('× 6');expect(body.querySelector('.shop-review').textContent).toContain('20 Zeny');
 click('确认');expect(service.submit).toHaveBeenCalledOnce();expect(body.querySelector('.shop-status').textContent).toContain('等待');expect(body.querySelector('.inventory-item').disabled).toBe(true);click('核对订单');expect(service.submit).toHaveBeenCalledOnce();
});
it('rejects changed order terms but tolerates asynchronous item icon loads',()=>{
 click('核对订单');state.items[0].limit=1;click('确认');expect(service.submit).not.toHaveBeenCalled();
 state.items[0].limit=10;panel.update();click('核对订单');state.items[0].icon='icon.bmp';click('确认');expect(service.submit).toHaveBeenCalledOnce();
});
it('labels proceeds for sales, supports empty shops and never submits a cancelled review',()=>{
 state.mode='sell';panel.update();expect(body.querySelector('.shop-summary').textContent).toContain('获得合计');click('核对订单');click('取消');expect(service.submit).not.toHaveBeenCalled();
 state.items=[];panel.update();expect(body.querySelector('.shop-empty').textContent).toBe('没有可出售的物品');expect([...body.querySelectorAll('button')].find(el=>el.textContent==='核对订单').disabled).toBe(true);
});

it('blocks reviewing or changing items with unapplied quantities and allows explicit revert',()=>{
 state.items.push({...state.items[0],index:1,ID:502,name:'蓝色药水'});panel.update();
 body.querySelector('.inventory-item').click();const input=body.querySelector('input');input.value='8';input.dispatchEvent(new Event('input'));
 click('核对订单');expect(body.querySelector('dialog')).toBeNull();expect(service.submit).not.toHaveBeenCalled();
 expect(body.querySelector('.shop-status').textContent).toContain('尚未应用');
 body.querySelectorAll('.inventory-item')[1].click();expect(body.querySelector('input')).toBe(input);
 click('撤销修改');expect(input.value).toBe('2');click('核对订单');expect(body.querySelector('dialog')).not.toBeNull();
});
it('reviews applied quantities and places the total outside the scrollable item list',()=>{
 service.set.mockImplementation((index,id,count)=>{state.items[0].quantity=count;state.total=count*10;return '';});
 body.querySelector('.inventory-item').click();const input=body.querySelector('input');input.value='8';input.dispatchEvent(new Event('input'));
 body.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}));click('核对订单');
 expect(body.querySelector('.shop-review-lines').textContent).toContain('红色药水 × 8');expect(body.querySelector('.shop-review > strong').textContent).toContain('80 Zeny');
 expect(body.querySelector('.shop-review-lines strong')).toBeNull();
});
it('keeps an unapplied quantity after persistence rejects an update',()=>{
 service.set.mockReturnValue('物品状态已变化');body.querySelector('.inventory-item').click();const input=body.querySelector('input');input.value='8';input.dispatchEvent(new Event('input'));
 body.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}));click('核对订单');expect(body.querySelector('dialog')).toBeNull();expect(input.value).toBe('8');
});
