import { afterEach, expect, it, vi } from 'vitest';
vi.mock('UI/Components/GameTools/AdventureControlService.js', () => ({ searchAdventureItems: vi.fn() }));
import { searchAdventureItems } from '../../src/UI/Components/GameTools/AdventureControlService.js';
import { createPickupSettingsPanel } from '../../src/UI/Game/PickupSettingsPanel.js';
import { pickupDefaults } from '../../src/UI/Game/PickupSettings.js';
afterEach(() => { document.body.replaceChildren(); vi.clearAllMocks(); });
it('disables filters while off, preserves them and searches/adds/removes exclusions', async () => {
 const section = document.createElement('section'); document.body.append(section); const draft = pickupDefaults();
 createPickupSettingsPanel(section, draft);
 expect(section.querySelector('fieldset').disabled).toBe(true);
 const toggle = section.querySelector('[data-pickup=enabled]'); toggle.checked = true; toggle.dispatchEvent(new Event('input'));
 expect(draft.enabled).toBe(true); expect(section.querySelector('fieldset').disabled).toBe(false);
 const range = section.querySelector('[data-pickup=range]'); range.value = '8'; range.dispatchEvent(new Event('input')); expect(draft.range).toBe(8);
 const card = section.querySelector('[data-category=card]'); card.checked = false; card.dispatchEvent(new Event('input')); expect(draft.categories).not.toContain('card');
 searchAdventureItems.mockResolvedValue({ data: [{ Id: 501, names: { 'zh-CN': '红色药水' } }], total: 1 });
 section.querySelector('input[type=search]').value = '药水';
 const click = text => [...section.querySelectorAll('button')].find(button => button.textContent === text).click();
 click('搜索'); await vi.waitFor(() => expect(section.textContent).toContain('红色药水'));
 click('排除'); expect(draft.excluded).toEqual([{ id: 501, name: '红色药水' }]);
 toggle.checked = false; toggle.dispatchEvent(new Event('input')); expect(draft.range).toBe(8); expect(draft.excluded).toHaveLength(1);
 toggle.checked = true; toggle.dispatchEvent(new Event('input')); click('移除'); expect(draft.excluded).toEqual([]);
});

it('debounces valid numbers, ignores invalid values, retries failures and cancels timers on destroy', () => {
 vi.useFakeTimers();
 try {
 const section=document.body.appendChild(document.createElement('section'));
 const save=vi.fn(() => true);
 const editor=createPickupSettingsPanel(section,{...pickupDefaults(),enabled:true},save);
 const range=section.querySelector('[data-pickup=range]');
 const input=value=>{range.value=value;range.dispatchEvent(new Event('input'));};
 input('8'); vi.advanceTimersByTime(200); input('9'); vi.advanceTimersByTime(399); expect(save).not.toHaveBeenCalled();
 vi.advanceTimersByTime(1); expect(save).toHaveBeenLastCalledWith(expect.objectContaining({range:9}));
 input('99'); vi.advanceTimersByTime(500); expect(save).toHaveBeenCalledOnce();
 input('10'); save.mockReturnValue(false); range.dispatchEvent(new Event('blur'));
 expect(section.querySelector('.pickup-save-status').textContent).toContain('保存失败');
 save.mockReturnValue(true); [...section.querySelectorAll('button')].find(x=>x.textContent==='重试').click();
 expect(section.querySelector('.pickup-save-status').textContent).toBe('已保存');
 const count=save.mock.calls.length; input('11'); editor.destroy(); vi.advanceTimersByTime(500); expect(save).toHaveBeenCalledTimes(count);
 } finally {vi.useRealTimers();}
});
