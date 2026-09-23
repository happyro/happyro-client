import {expect,it,vi} from 'vitest';
import {createMapsPanel} from '../../src/UI/Mobile/game/MapsPanel.js';
it('ignores stale map images after a newer selection, current-map switch or destruction',()=>{
 const requests=[],body=document.createElement('div'),local=vi.fn();
 const maps={regions:[{id:'region',name:'区域',maps:[{id:'prontera',name:'城市'},{id:'field',name:'原野'}]}],current:()=> 'prontera',mapName:id=>id,loadMap:(id,callback)=>requests.push({id,callback}),loadRegion:(id,callback)=>requests.push({id,callback})};
 const panel=createMapsPanel(body,maps,local,{id:'prontera',x:100,y:200});expect(body.textContent).toContain('100, 200');
 [...body.querySelectorAll('button')].find(b=>b.textContent==='原野 · field').click();requests[0].callback('old.png');expect(body.querySelector('img')).toBeNull();requests[1].callback('field.png');expect(body.querySelector('img').getAttribute('src')).toBe('field.png');
 [...body.querySelectorAll('button')].find(b=>b.textContent==='区域全图').click();body.querySelector('[data-local]').click();requests[2].callback('region.png');expect(body.querySelector('img')).toBeNull();expect(local).toHaveBeenCalledOnce();
 [...body.querySelectorAll('button')].find(b=>b.textContent==='原野 · field').click();panel.destroy();requests[3].callback('late.png');expect(body.querySelector('img')).toBeNull();
});
it('searches names and identifiers and reports a missing resource without inserting HTML',()=>{
 const body=document.createElement('div');const maps={regions:[{id:'r',name:'区域',maps:[{id:'map1',name:'<script>名称</script>'},{id:'map2',name:'另一个'}]}],current:()=> 'map1',mapName:id=>id,loadMap:(_,done)=>done(null),loadRegion:(_,done)=>done(null)};
 createMapsPanel(body,maps,vi.fn(),{id:'map1'});expect(body.textContent).toContain('地图图片不可用');expect(body.querySelector('script')).toBeNull();const search=body.querySelector('input');search.value='MAP2';search.dispatchEvent(new Event('input'));expect(body.querySelector('.inventory-list').textContent).toContain('另一个');expect(body.querySelector('.inventory-list').textContent).not.toContain('map1');
});
