import { describe, expect, it } from 'vitest';
import { getLocalizedButtonLabel } from '../../src/UI/LocalizedButtonLabels.js';

describe('getLocalizedButtonLabel', () => {
	it.each([
		['btn_ok.bmp', '确定'],
		['btn_cancel.bmp', '取消'],
		['btn_close.bmp', '关闭'],
		['btn_reset.bmp', '重置'],
		['BTN_BUY.BMP', '购买'],
		['skin\\BTN_SELL.BMP', '出售'],
		['btn_edit.bmp', '编辑'],
		['BTN_EXCHANGE.BMP', '交换'],
		['btn_view.bmp', '查看'],
		['btn_next.bmp', '下一步'],
		['btn_apply.bmp', '应用'],
		['btn_ok_dis.bmp', '确定'],
		['btn_exchange_dis.bmp', '交换'],
		['btn_feed.bmp', '喂食'],
		['btn_make.bmp', '创建'],
		['btn_q_active.bmp', '启用'],
		['bt_search_normal.bmp', '搜索'],
		['bank/btn_deposit_out.bmp', '存款'],
		['bank/btn_1000mil_out.bmp', '+1000万'],
		['basic_interface/rodexsystem/renewal/btn_search_out.bmp', '搜索'],
		['basic_interface/rodexsystem/renewal/btn_reply_out.bmp', '回复'],
		['basic_interface/cancel2.bmp', '取消'],
		['basic_interface/send.bmp', '发送'],
		['basic_interface/inputzeny.bmp', '输入金额'],
		['basic_interface/roullette/StartRoullette_a.bmp', '开始抽奖'],
		['login_interface/btn_connect.bmp', '登录'],
		['cashshop/btn_searchbar_normal.bmp', '搜索'],
		['make_character/btn_create_out.bmp', '创建'],
		['swap_equipment/btn_change2_normal.bmp', '切换'],
		['esc_01a.bmp', '返回角色选择'],
		['esc_04a.bmp', '返回保存点'],
		['esc_05a.bmp', '使用复活道具'],
		['esc_08a.bmp', '快捷键设置']
	])('localizes %s', (background, label) => {
		expect(getLocalizedButtonLabel(background)).toBe(label);
	});

	it('ignores non-text interface assets', () => {
		expect(getLocalizedButtonLabel('btn_resize.bmp')).toBeNull();
		expect(getLocalizedButtonLabel('basic_interface/rodexsystem/renewal/btn_next_out.bmp')).toBeNull();
		expect(getLocalizedButtonLabel('lapine/btn_moveitem_out.bmp')).toBeNull();
	});
});
