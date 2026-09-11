export function localizeGuildPositionName(name) {
	if (!name) {
		return name;
	}
	if (name === 'GuildMaster') {
		return '会长';
	}
	if (name === 'Newbie') {
		return '新成员';
	}
	const match = /^Position (\d+)$/.exec(name);
	if (match) {
		return `职位 ${match[1]}`;
	}
	return name;
}

export default localizeGuildPositionName;
