export const reputationGroupNames = {
	1: '魔物伙伴',
	2: '阿卢纳贝兹'
};

export const reputationNames = {
	1: '兽人部落',
	2: '哥布灵部落',
	3: '灰狼村'
};

export function localizeReputation(table, names) {
	for (const [id, entry] of Object.entries(table)) {
		if (names[id]) entry.Name = names[id];
	}
}
