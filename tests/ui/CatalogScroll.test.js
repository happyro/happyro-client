import { afterEach, expect, it } from 'vitest';
import { trackTabView } from '../../src/UI/Components/GameTools/TabViewState.js';
import { mountRemoteCatalogBrowser } from '../../src/UI/Components/GameTools/RemoteCatalogBrowser.js';
let view, cleanup;
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
afterEach(() => { cleanup?.(); view?.destroy(); document.body.replaceChildren(); });
it('resets changed content but retains list position on selection and detail position on refresh', async () => {
 const container = document.createElement('div'); document.body.append(container);
 view = trackTabView(container);
 let api;
 cleanup = mountRemoteCatalogBrowser(container, {
  placeholder: '', searchLabel: 'Search', emptyDetail: '', pageSize: 2,
  key: item => item.id,
  load: async ({page}) => ({items: [{id:page*2}, {id:page*2+1}], total:6}),
  renderRow: item => `<button data-catalog-key="${item.id}">${item.id}</button>`,
  renderDetail: (detail, item) => { detail.dataset.selected = item.id; detail.innerHTML='<div class="nested-scroll">Details</div>'; },
  onReady: value => { api=value; }
 });
 await tick();
 const list=container.querySelector('.catalog-list');
 const scroll=(node,value)=>{node.scrollTop=value;node.dispatchEvent(new Event('scroll'));};
 scroll(list,90); scroll(container.querySelector('.nested-scroll'),80);
 api.refreshDetail(); await tick();
 expect(container.querySelector('.nested-scroll').scrollTop).toBe(80);
 container.querySelectorAll('[data-catalog-key]')[1].click(); await tick();
 expect(list.scrollTop).toBe(90);
 expect(container.querySelector('.nested-scroll').scrollTop).toBe(0);
 container.querySelector('.catalog-next').click(); await tick();
 expect(list.scrollTop).toBe(0);
 expect(container.querySelector('.catalog-detail').dataset.selected).toBe('4');
 container.querySelector('.catalog-prev').click(); await tick();
 expect(container.querySelector('.catalog-detail').dataset.selected).toBe('2');
 scroll(list,60); api.reload(); await tick();
 expect(list.scrollTop).toBe(0);
});
