import { afterEach, expect, it, vi } from 'vitest';
const callbacks = vi.hoisted(() => ({ confirm: null, feedback: vi.fn() }));
vi.mock('UI/Components/Confirmation.js', () => ({ confirmAction: (_body, _title, confirm) => { callbacks.confirm = confirm; } }));
vi.mock('UI/Components/Feedback.js', () => ({ createFeedback: () => callbacks.feedback }));
vi.mock('../../src/UI/Mobile/game/ListItemText.js', () => ({ setListItemText: (node, text) => { node.textContent = text; }, setListItemIcon: () => {} }));
import { createEnchantPanel } from '../../src/UI/Mobile/game/EnchantPanel.js';
function setup() {
 const item = { index: 2, ID: 610039, name: '绿光拳刃', category: 'equipment', type: 5, subtypes: ['Katar'] };
 const choice = { key: 'perfect:Sharp1', action: 'perfect', name: '指定附魔：尖锐Lv1', rate: 100000, zeny: 100000, materials: [{ ITID: 25669, name: '神秘零件', count: 20 }] };
 const state = { items: [item], selected: null, choices: [], allowed: true, message: '请选择装备', zeny: 200000, materialCounts: { 25669: 40 } };
 const service = { snapshot: () => state, select: vi.fn(() => { state.selected = { index: 2, ID: 610039 }; state.choices = [choice]; return ''; }), confirm: vi.fn(() => '') };
 const body = document.createElement('div'); document.body.append(body);
 const panel = createEnchantPanel(body, service);
 return { state, service, body, panel };
}
afterEach(() => { document.body.replaceChildren(); callbacks.confirm = null; vi.clearAllMocks(); });
it('keeps the method control mounted from the empty state and previews the first actual choice', () => {
 const { body, panel, state } = setup();
 const select = body.querySelector('select[aria-label="附魔方式"]');
 expect(select.disabled).toBe(true);
 expect(body.querySelector('.interaction-footer > button').disabled).toBe(true);
 body.querySelector('.inventory-item').click();
 expect(body.querySelector('select[aria-label="附魔方式"]')).toBe(select);
 expect(select.value).toBe('perfect:Sharp1');
 expect(body.querySelector('.inventory-detail').textContent).toContain('拥有：40');
 state.materialCounts[25669] = 10; panel.update();
 expect(body.querySelector('.inventory-detail').textContent).toContain('拥有：10');
});
it('filters equipment by name or ID and keeps an explicit no-match state', () => {
 const { body } = setup(); const search = body.querySelector('input[type="search"]');
 search.value = 'not-an-item'; search.dispatchEvent(new Event('input'));
 expect(body.querySelectorAll('.inventory-item')).toHaveLength(0);
 expect(body.querySelector('.inventory-list').textContent).toContain('没有匹配的装备');
 search.value = '610039'; search.dispatchEvent(new Event('input'));
 expect(body.querySelectorAll('.inventory-item')).toHaveLength(1);
});
it('rejects a stale confirmation after the selected equipment changes', () => {
 const { body, state, service } = setup(); body.querySelector('.inventory-item').click();
 body.querySelector('.interaction-footer > button').click();
 state.selected = { index: 3, ID: 610039 }; callbacks.confirm();
 expect(service.confirm).not.toHaveBeenCalled();
 expect(callbacks.feedback).toHaveBeenCalledWith('装备已变化，请重新核对', 'error');
});
