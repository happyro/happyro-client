import MonsterTable from 'DB/Monsters/MonsterTable.js';

const JobDisplayNameTable = {
	0: '初心者', 1: '剑士', 2: '魔法师', 3: '弓箭手', 4: '服事', 5: '商人', 6: '盗贼',
	7: '骑士', 8: '牧师', 9: '巫师', 10: '铁匠', 11: '猎人', 12: '刺客', 13: '骑士',
	14: '十字军', 15: '武僧', 16: '贤者', 17: '流氓', 18: '炼金术师', 19: '诗人', 20: '舞娘',
	21: '十字军', 22: '结婚礼服', 23: '超级初心者', 24: '神枪手', 25: '忍者',
	4001: '进阶初心者', 4002: '进阶剑士', 4003: '进阶魔法师', 4004: '进阶弓箭手',
	4005: '进阶服事', 4006: '进阶商人', 4007: '进阶盗贼', 4008: '进阶骑士',
	4009: '进阶牧师', 4010: '进阶巫师', 4011: '进阶铁匠', 4012: '进阶猎人',
	4013: '进阶刺客', 4014: '进阶骑士', 4015: '进阶十字军', 4016: '进阶武僧',
	4017: '进阶贤者', 4018: '进阶流氓', 4019: '进阶炼金术师', 4020: '进阶诗人',
	4021: '进阶舞娘', 4022: '进阶十字军', 4023: '宝宝初心者', 4024: '宝宝剑士',
	4025: '宝宝魔法师', 4026: '宝宝弓箭手', 4027: '宝宝服事', 4028: '宝宝商人', 4029: '宝宝盗贼',
	4218: '召唤师',
	4220: '召唤师宝宝'
};

const translatedJobNames = {
	Swordman: '剑士', Mage: '魔法师', Magician: '魔法师', Archer: '弓箭手', Acolyte: '服事', Merchant: '商人', Thief: '盗贼',
	Knight: '骑士', Priest: '牧师', Wizard: '巫师', Blacksmith: '铁匠', Hunter: '猎人', Assassin: '刺客', Crusader: '十字军',
	Monk: '武僧', Sage: '贤者', Rogue: '流氓', Alchemist: '炼金术师', Bard: '诗人', Dancer: '舞娘', Gunslinger: '神枪手', Ninja: '忍者',
	'High Swordman': '进阶剑士', 'High Mage': '进阶魔法师', 'High Archer': '进阶弓箭手', 'High Acolyte': '进阶服事', 'High Merchant': '进阶商人', 'High Thief': '进阶盗贼',
	'Lord Knight': '骑士领主', 'High Priest': '高阶牧师', 'High Wizard': '高阶巫师', Mastersmith: '神工匠', Sniper: '神射手', 'Assassin Cross': '十字刺客', Paladin: '圣骑士', Champion: '冠军', Scholar: '学者', Stalker: '追踪者', Biochemist: '创造者', Minstrel: '宫廷乐师', Gypsy: '冷艳舞姬',
	'Super Baby': '超级宝宝', 'Taekwon Boy': '跆拳少年', 'Taekwon Master': '跆拳宗师', 'Soul Linker': '灵魂链接者', 'Death Knight': '死亡骑士', 'Dark Collector': '暗黑收集者',
	'Rune Knight': '符文骑士', Warlock: '大法师', Ranger: '游侠', 'Arc Bishop': '大主教', Mechanic: '机甲神匠', 'Guillotine Cross': '十字斩首者', 'Royal Guard': '皇家卫士', Sorcerer: '妖术师', Wanderer: '漫游舞者', Sura: '修罗', Genetic: '基因学者', 'Shadow Chaser': '魅影追踪者'
};

export function getJobDisplayName(jobId, fallback = '未知') {
	const name = JobDisplayNameTable[jobId] || MonsterTable[jobId];
	return translatedJobNames[name] || name || fallback;
}

export default JobDisplayNameTable;
