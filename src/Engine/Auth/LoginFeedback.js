import { registrationServerError } from './RegistrationValidation.js';

// Current HappyRO login.cpp account states and ticket authentication results.
// Protocol errors are independent of kRO's regional message-table numbering.
const loginErrors = new Map([
	[0, '登录失败，账号不存在'],
	[1, '登录失败，密码错误'],
	[2, '登录失败，账号已到期'],
	[3, '登录失败，服务器拒绝连接'],
	[4, '登录失败，账号已被停用'],
	[5, '登录失败，客户端版本校验未通过，请刷新页面'],
	[7, '登录失败，服务器人数已达上限'],
	[8, '登录失败，账号仍在线'],
	[9, '登录失败，账号已被封禁'],
	[10, '登录失败，账号邮箱未验证'],
	[11, '登录失败，账号已被管理员封禁'],
	[12, '登录失败，账号因数据库维护暂时停用'],
	[13, '登录失败，账号已锁定'],
	[14, '登录失败，账号没有登录权限'],
	[15, '登录失败，账号没有登录权限'],
	[99, '登录失败，账号已删除'],
	[100, '登录失败，账号仍在线'],
	[101, '登录失败，账号因安全调查已锁定'],
	[102, '登录失败，账号因异常调查暂时停用'],
	[103, '登录失败，角色正在删除中'],
	[104, '登录失败，角色正在删除中']
]);

export function loginFailureMessage(code, blockDate) {
	const registration = registrationServerError(code);
	if (registration) return registration;
	if (code === 6) {
		const until = typeof blockDate === 'string' ? blockDate.replace(/\0.*$/, '').trim() : '';
		return until ? `登录失败，账号封禁至 ${until}` : '登录失败，账号暂时被封禁';
	}
	return loginErrors.get(code) ?? `登录失败（错误码：${code}）`;
}

// SC_NOTIFY_BAN results emitted by login, character and map servers.
const disconnectErrors = new Map([
	[0, '与服务器断开连接'],
	[1, '服务器暂时不可用，请稍后重试'],
	[2, '账号已在其他地方登录'],
	[3, '与服务器同步超时，连接已断开'],
	[4, '服务器人数已达上限，请稍后重试'],
	[8, '登录失败，账号仍在线'],
	[10, '账号已到期，连接已断开'],
	[15, '连接已被管理员断开']
]);

export function serverDisconnectMessage(code) {
	return disconnectErrors.get(code) ?? `连接已断开（错误码：${code}）`;
}
