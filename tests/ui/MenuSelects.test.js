import { describe, expect, it, vi } from 'vitest';
import { createMenuSelects } from '../../src/UI/Mobile/game/MenuSelects.js';

describe('mobile menu selects', () => {
 it('keeps native form values and handlers, disabled choices and keyboard navigation', () => {
  document.body.innerHTML = '<form><label>分类<select name="category"><option value="a">全部</option><option value="x" disabled>不可用</option><option value="b">装备</option></select></label></form>';
  const form = document.querySelector('form');
  const select = form.querySelector('select');
  const change = vi.fn();
  const input = vi.fn();
  form.addEventListener('input', input);
  form.addEventListener('change', change);
  const adapter = createMenuSelects(form);
  const trigger = form.querySelector('.game-select-trigger');
  trigger.click();
  form.querySelector('[data-value="x"]').click();
  expect(select.value).toBe('a');
  trigger.dispatchEvent(new KeyboardEvent('keydown', {key:'End', bubbles:true}));
  expect(document.activeElement.dataset.value).toBe('b');
  document.activeElement.click();
  expect(new FormData(form).get('category')).toBe('b');
  expect(change).toHaveBeenCalledTimes(1);
  expect(input).toHaveBeenCalledTimes(1);
  expect(trigger.textContent).toBe('装备');
  adapter.sync();
  expect(trigger.getAttribute('aria-label')).toBe('分类');
  adapter.destroy();
 });
 it('refreshes dynamic options and cleans up replaced panels', async () => {
  document.body.innerHTML = '<section><select aria-label="目标"><option value="a">A</option></select></section>';
  const body = document.querySelector('section');
  const adapter = createMenuSelects(body);
  const select = body.querySelector('select');
  select.innerHTML = '<option value="b">B</option>';
  select.disabled = true;
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(body.querySelector('.game-select-trigger').disabled).toBe(true);
  expect(body.querySelector('.game-select-trigger').textContent).toBe('B');
  select.remove();
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(body.querySelector('.menu-select')).toBeNull();
  adapter.destroy();
 });
});
