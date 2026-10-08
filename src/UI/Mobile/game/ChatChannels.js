export const chatChannelLabels = {
	public: '附近',
	private: '私聊',
	party: '队伍',
	guild: '公会',
	clan: '氏族',
	system: '系统',
	battle: '战斗'
};

export const previewCategories = { all: '全部', dialogue: '对话', battle: '战斗', system: '系统' };
export function matchesPreviewCategory(message, category) {
	if (category === 'all') return true;
	if (category === 'dialogue') return ['public', 'private', 'party', 'guild', 'clan'].includes(message.channel);
	return message.channel === category;
}
