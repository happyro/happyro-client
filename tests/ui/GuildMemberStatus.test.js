import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync('src/UI/Components/Guild/Guild.js', 'utf8');
const implementation = source.match(/Guild.updateMemberStatus = function[^]*?\n\};/)[0];
describe('guild member online notifications', () => {
 it('uses roster names when the member tab has not been rendered', () => {
  const members = [{ AID: 1, GID: 2, CharName: '公会成员甲', CurrentState: 0 }];
  const addText = vi.fn();
  const count = { textContent: '' };
  const Guild = {};
  vm.runInNewContext(implementation, { Guild, _members: members, _root: () => ({querySelector: selector => selector.includes('.online') ? count : null}), ChatBox: {addText, TYPE:{BLUE:1}, FILTER:{GUILD:2}} });
  Guild.updateMemberStatus({ AID: 1, GID: 2, status: 1 });
  expect(addText).toHaveBeenLastCalledWith('公会成员 公会成员甲上线了', 1, 2);
  expect(count.textContent).toBe(1);
  Guild.updateMemberStatus({ AID: 1, GID: 2, status: 0 });
  expect(addText).toHaveBeenLastCalledWith('公会成员 公会成员甲离线了', 1, 2);
  expect(count.textContent).toBe(0);
  Guild.updateMemberStatus({ AID: 9, GID: 9, status: 1 });
  expect(addText).toHaveBeenCalledTimes(2);
 });
});
