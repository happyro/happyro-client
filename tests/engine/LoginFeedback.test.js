import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { loginFailureMessage, serverDisconnectMessage } from '../../src/Engine/Auth/LoginFeedback.js';

it('distinguishes authentication rejection from disconnect codes', () => {
 expect(loginFailureMessage(1)).toBe('登录失败，密码错误');
 expect(serverDisconnectMessage(1)).toBe('服务器暂时不可用，请稍后重试');
 expect(loginFailureMessage(2)).toBe('登录失败，账号已到期');
 expect(serverDisconnectMessage(2)).toBe('账号已在其他地方登录');
 expect(loginFailureMessage(5)).toContain('客户端版本校验未通过');
 expect(loginFailureMessage(4)).toContain('账号已被停用');
 expect(loginFailureMessage(10)).toContain('邮箱未验证');
 expect(serverDisconnectMessage(10)).toBe('账号已到期，连接已断开');
});
it('handles dated bans and unknown errors without leaking placeholders', () => {
 expect(loginFailureMessage(6, '2026-12-01 12:00:00\0junk')).toBe('登录失败，账号封禁至 2026-12-01 12:00:00');
 expect(loginFailureMessage(6)).toBe('登录失败，账号暂时被封禁');
 expect(loginFailureMessage(6, ' ')).toBe('登录失败，账号暂时被封禁');
 expect(loginFailureMessage(250)).toBe('登录失败（错误码：250）');
 expect(serverDisconnectMessage(250)).toBe('连接已断开（错误码：250）');
});
for (const name of ['onConnectionRefused', 'onServerClosed']) {
 it(`${name} shows the online-account message and returns to login`, () => {
  const source = readFileSync('src/Engine/LoginEngine.js', 'utf8');
  const fn = source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))[0];
  const showMessageBox = vi.fn(), close = vi.fn(), append = vi.fn(), removeComponents = vi.fn();
  const retryPendingSession = vi.fn(() => false);
  const receive = vm.runInNewContext(`(${fn})`, {
   loginFailureMessage, serverDisconnectMessage, retryPendingSession, sessionTicketLogin: false,
   WinLoading: { remove: vi.fn() }, Network: { close },
   UIManager: { showMessageBox, removeComponents }, WinLogin: { getUI: () => ({ append }) },
   LoginEngine: { logout: vi.fn() }, recovery: { cancel: vi.fn() }
  });
  receive({ ErrorCode: 8 });
  expect(showMessageBox.mock.lastCall[0]).toBe('登录失败，账号仍在线');
  expect(close).toHaveBeenCalledOnce();
  showMessageBox.mock.lastCall[2]();
  expect(removeComponents).toHaveBeenCalledOnce();expect(append).toHaveBeenCalledOnce();
  retryPendingSession.mockReturnValue(true);receive({ ErrorCode: 8 });
  expect(showMessageBox).toHaveBeenCalledOnce();expect(close).toHaveBeenCalledOnce();
 });
}

it('asks before opening configured registration without trial or billing claims', () => {
 const source = readFileSync('src/UI/Components/WinLogin/WinLoginCommon.js', 'utf8');
 const fn = source.match(/function signup\([^]*?\n\t\}/)[0];
 const showPromptBox = vi.fn(), open = vi.fn();
 const signup = vm.runInNewContext(`(${fn})`, {
  Configs: { get: () => 'https://example.test/register' }, UIManager: { showPromptBox }, window: { open }
 });
 signup();
 expect(showPromptBox.mock.lastCall[0]).toBe('是否打开账号注册页面？');
 expect(open).not.toHaveBeenCalled();
 showPromptBox.mock.lastCall[3]();
 expect(open).toHaveBeenCalledWith('https://example.test/register');
});
