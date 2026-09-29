import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';

for (const component of ['Equipment', 'SkillList']) {
 const source = readFileSync(`src/UI/Components/${component}/${component}Common.js`, 'utf8').replaceAll('\r\n', '\n');
 const start = source.indexOf('Component.onLevelUp = function onLevelUp() {');
 const handler = source.slice(start, source.indexOf('\n\t};', start) + 4);
 it(`${component} removes desktop badges on mobile and keeps desktop behavior`, () => {
  const button = document.createElement('button');
  document.body.append(button);
  const componentApi = {};
  const platform = { isMobile: true };
  new Function('Component', 'Platform', '_btnLevelUp', 'UIVersionManager', handler)(componentApi, platform, button, { getEquipmentVersion: vi.fn(() => 1) });
  componentApi.onLevelUp();
  expect(button.isConnected).toBe(false);
  platform.isMobile = false;
  componentApi.onLevelUp();
  expect(button.isConnected).toBe(true);
  button.remove();
 });
}
