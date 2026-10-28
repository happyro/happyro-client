import DB from 'DB/DBManager.js';

// Message IDs are defined by rAthena's MSI_ENCHANT_* responses (clif.hpp).
export function enchantResultMessage(msgId, action) {
	const operation = action === 'reset' ? '重置附魔' : action === 'upgrade' ? '附魔升级' : '附魔';
	if (msgId === 3857) return `${operation}成功`;
	if (msgId === 3858) return `${operation}失败`;
	return DB.getMessage(msgId) || `${operation}未完成（${msgId}）`;
}
