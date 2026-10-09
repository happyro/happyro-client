import { afterEach, expect, it, vi } from 'vitest';
import { createNPCPanel, updateNPCCutin } from '../../src/UI/Mobile/game/NPCPanel.js';
afterEach(() => document.body.replaceChildren());
it('separates scrollable choices from actions and retains protocol option values', () => {
 const body=document.body.appendChild(document.createElement('div'));const respond=vi.fn();
 createNPCPanel(body,{mode:'menu',lines:['<b>你好</b>'],options:[{text:'选项一',value:3},{text:'选项二',value:7}],respond});
 expect(body.querySelector('.npc-lines').textContent).toBe('<b>你好</b>');expect(body.querySelector('b')).toBeNull();
 body.querySelectorAll('.npc-options button')[1].click();expect(respond).toHaveBeenCalledWith(7);
 expect(body.querySelector('.npc-actions').hidden).toBe(true);
 updateNPCCutin(body,{image:'npc.bmp'});expect(body.querySelector('.npc-content > img')).not.toBeNull();
 updateNPCCutin(body,{});expect(body.querySelector('img')).toBeNull();
});
it('shows waiting and input validation inside the dialog without a toast', () => {
 const body=document.body.appendChild(document.createElement('div'));
 createNPCPanel(body,{mode:'waiting'});expect(body.querySelector('[role=status]').textContent).toContain('等待 NPC');expect(document.querySelector('.ui-toast')).toBeNull();
 const respond=vi.fn(()=> '请输入有效的整数');createNPCPanel(body,{mode:'number',respond});
 const input=body.querySelector('input');input.value='abc';body.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}));
 expect(respond).toHaveBeenCalledWith('abc');expect(input.getAttribute('aria-invalid')).toBe('true');expect(body.querySelector('.npc-error').hidden).toBe(false);
});
