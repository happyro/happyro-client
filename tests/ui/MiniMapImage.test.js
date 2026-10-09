import { expect, it, vi, afterEach } from 'vitest';
vi.mock('Renderer/Map/Altitude.js', () => ({default:{width:2,height:2,TYPE:{WALKABLE:1,WATER:2,SNIPABLE:4},getCellType:(x,y)=>[[1,0],[2,4]][y][x]}}));
import { createAltitudeFallback, hasVisiblePixels } from '../../src/UI/Components/MiniMap/MiniMapImage.js';
afterEach(()=>vi.restoreAllMocks());
it('draws indoor walkable terrain with north at the top and preserves blocked cells',()=>{
 let pixels;
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:image=>pixels=image.data});
 const canvas=createAltitudeFallback();expect(canvas.width).toBe(512);
 const sample=(x,y)=>[...pixels.slice((y*512+x)*4,(y*512+x)*4+4)];
 expect(sample(0,0)).toEqual([74,137,164,230]);
 expect(sample(511,0)).toEqual([105,113,108,190]);
 expect(sample(0,511)).toEqual([205,211,198,230]);
 expect(sample(511,511)).toEqual([0,0,0,0]);
});
it('detects transparent minimap placeholders so terrain can be shown instead',()=>{
 const data=new Uint8ClampedArray(8);
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:vi.fn(),getImageData:()=>({data})});
 expect(hasVisiblePixels({naturalWidth:2,naturalHeight:1})).toBe(false);
 data[7]=255;expect(hasVisiblePixels({naturalWidth:2,naturalHeight:1})).toBe(true);
});
