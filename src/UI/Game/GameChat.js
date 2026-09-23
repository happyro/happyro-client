import Session from 'Engine/SessionStorage.js';
import ChatBox from 'UI/Components/ChatBox/ChatBox.js';

export function chatChannel(message) {
	const type = message.colorType || 0;
	if (type & ChatBox.TYPE.PRIVATE) return 'private';
	if (type & ChatBox.TYPE.PARTY) return 'party';
	if (type & ChatBox.TYPE.GUILD) return 'guild';
	if (type & ChatBox.TYPE.CLAN) return 'clan';
	if (message.filterType === ChatBox.FILTER.PUBLIC_CHAT) return 'public';
	return 'system';
}
export function createGameChat(send, canOperate) {
	return {
		send(text, channel, receiver = '') {
			text = text.trim();
			receiver = receiver.trim();
			if (!canOperate() || !Session.Playing) return '当前不能发送消息';
			if (!text || text.length > 120) return '请输入 1 至 120 个字符';
			if (!['public', 'private', 'party', 'guild', 'clan'].includes(channel)) return '请选择聊天频道';
			if (channel === 'private' && (!receiver || receiver.length > 24)) return '请输入有效的私聊对象';
			if (channel === 'party' && !Session.hasParty) return '尚未加入队伍';
			if (channel === 'guild' && !Session.hasGuild) return '尚未加入公会';
			send(text, channel, receiver);
			return '';
		}
	};
}
