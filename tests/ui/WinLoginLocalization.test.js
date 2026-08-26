import { describe, expect, it } from 'vitest';
import defaultLoginHtml from '../../src/UI/Components/WinLogin/WinLogin/WinLogin.html?raw';
import loginV2Html from '../../src/UI/Components/WinLogin/WinLoginV2/WinLoginV2.html?raw';
import loginCommonSource from '../../src/UI/Components/WinLogin/WinLoginCommon.js?raw';

describe('WinLogin localization', () => {
	it.each([defaultLoginHtml, loginV2Html])('uses a Chinese remember-account control', html => {
		expect(html).toContain('记住账号');
		expect(html).toContain('role="checkbox"');
		expect(html).not.toContain('chk_save');
	});

	it('uses Chinese simplified-registration instructions', () => {
		expect(loginCommonSource).toContain("Configs.get('registrationNotice')");
		expect(loginCommonSource).toContain('UIManager.showMessageBox(registrationNotice');
		expect(loginCommonSource).toContain('当前支持快速注册');
		expect(loginCommonSource).toContain('_M（男）');
		expect(loginCommonSource).toContain('_F（女）');
		expect(loginCommonSource).not.toContain('No registration URL was provided');
	});

	it('uses the original login bitmap and a Chinese registration command', () => {
		expect(loginV2Html).toContain('class="server-name">HappyRO</div>');
		expect(loginV2Html).toContain('bt_start_normal.bmp');
		expect(loginV2Html).toContain('bt_start_over.bmp');
		expect(loginV2Html).toContain('bt_start_press.bmp');
		expect(loginV2Html).toContain('登录');
		expect(loginV2Html).toContain('注册');
	});
});
