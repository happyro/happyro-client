import PronteraNpcNameTable from './PronteraNpcNameTable';
import SecondStageNpcNameTable from './SecondStageNpcNameTable';
import P0P1FieldNpcNameTable from './P0P1FieldNpcNameTable';
import P2MjolnirFieldNpcNameTable from './P2MjolnirFieldNpcNameTable';
import P2YunoFieldNpcNameTable from './P2YunoFieldNpcNameTable';
import P2MajorCityFieldNpcNameTable from './P2MajorCityFieldNpcNameTable';
import P3CoreDungeonNpcNameTable from './P3CoreDungeonNpcNameTable';
import P3CoastalDungeonNpcNameTable from './P3CoastalDungeonNpcNameTable';
import P3ClockTowerNpcNameTable from './P3ClockTowerNpcNameTable';
import P3EarlyDungeonNpcNameTable from './P3EarlyDungeonNpcNameTable';
import P3GlastHeimNpcNameTable from './P3GlastHeimNpcNameTable';
import P3ClassicDungeonNpcNameTable from './P3ClassicDungeonNpcNameTable';
import P3TurtleIslandNpcNameTable from './P3TurtleIslandNpcNameTable';
import P3RegionalDungeonNpcNameTable from './P3RegionalDungeonNpcNameTable';
import P3MidgameDungeonNpcNameTable from './P3MidgameDungeonNpcNameTable';
import P3RemainingCommonNpcNameTable from './P3RemainingCommonNpcNameTable';

const PACKET_NAME_VISIBLE_LENGTH = 23;

const NpcNameTable = {
	...SecondStageNpcNameTable,
	...PronteraNpcNameTable,
	Fabian: '法比安',
	Steiner: '施泰纳',
	Chad: '查德',
	'Drunken Old Man': '醉酒老人',
	Shakir: '沙基尔',
	Sonya: '索尼娅',
	'Grandmother Alma': '阿尔玛奶奶',
	Fisk: '菲斯克',
	Paul: '保罗',
	'Wounded Swordsman': '受伤的剑士',
	'Captain Carocc': '卡洛克船长',
	Lumin: '卢敏',
	'Vigilante Ajegna': '治安队员阿杰尼亚',
	'Applicant Paul': '申请者保罗',
	'Applicant MacCarnie': '申请者麦卡尼',
	'Vigilante Gnocchi': '治安队员尼奥基',
	'Vigilante Aglio': '治安队员阿利奥',
	Sloth: '懒汉',
	'Well-known Troublemaker': '知名捣蛋鬼',
	Phelix: '菲利克斯',
	Meera: '米拉',
	Orwalk: '奥尔沃克',
	'Wizard Stanza': '巫师斯坦扎',
	Ralphie: '拉尔菲',
	Stacey: '斯泰西',
	Theodore: '西奥多',
	'Suspicious Guy': '可疑的人',
	Crumpler: '克伦普勒',
	'Psychic Advisor': '灵媒顾问',
	'Monster Scholar': '魔物学者',
	Citizen: '居民',
	Sailor: '水手',
	'Soldier - Morocc': '梦罗克士兵',
	'Volunteer - Morocc': '梦罗克志愿者',
	'Young Man': '青年',
	Grampa: '爷爷',
	'Wolf Young Man': '狼族青年',
	'Muka Young Man': '木卡青年',
	'Diamond Young Man': '钻石青年',
	'Pale Looking Young Man': '脸色苍白的青年',
	'Little Girl': '小女孩',
	'Little Boy': '小男孩',
	'Picky Lady': '挑剔的女士',
	'Ant Man': '蚂蚁人',
	'Assassin Boy': '刺客少年',
	Dimitri: '迪米特里',
	'Fly Man': '苍蝇人',
	'Uncle Morocc': '梦罗克大叔',
	'Uncle Assassin': '刺客大叔',
	Assassin: '刺客',
	Bartender: '酒保',
	'Assassin Guardian': '刺客守卫',
	Lady: '女士',
	'Archer Wolt': '弓箭手沃尔特',
	Chief: '首领',
	Guard: '卫兵',
	'Archer Joe': '弓箭手乔',
	Shuger: '舒格',
	Tono: '托诺',
	Merideth: '梅丽德丝',
	YuPi: '优皮',
	YuNa: '优娜',
	Strife: '斯特莱夫',
	Dairenne: '戴莲',
	'Curator of Library': '图书馆管理员',
	'Library Girl': '图书馆女孩',
	'An Old Man': '老人',
	Shevild: '谢维尔德',
	TenSue: '腾苏',
	Marvin: '马文',
	'Ginedin Rephere': '吉尼丁·雷菲尔',
	Garnet: '加内特',
	Henson: '亨森',
	Soldier: '士兵',
	'Universal Rental NPC': '通用租赁 NPC',
	'Card Seller': '卡片商人',
	'Job Master': '职业大师',
	'Reset Girl': '重置女孩',
	Stylist: '造型师',
	Warper: '传送师',
	'Kafra Voting Staff': '卡普拉投票员',
	'Cool Event Staff': '活动工作人员',
	'Kafra Employee': '卡普拉员工',
	'Apprentice Craftsman': '工匠学徒',
	'Milk Vendor': '牛奶商人',
	'Peco Peco Breeder': '大嘴鸟饲养员',
	'Pet Enthusiast': '宠物爱好者',
	Guide: '导游',
	Woman: '女性居民',
	'Warmhearted woman': '热心女士',
	...P0P1FieldNpcNameTable,
	...P2MjolnirFieldNpcNameTable,
	...P2YunoFieldNpcNameTable,
	...P2MajorCityFieldNpcNameTable,
	...P3CoreDungeonNpcNameTable,
	...P3CoastalDungeonNpcNameTable,
	...P3ClockTowerNpcNameTable,
	...P3EarlyDungeonNpcNameTable,
	...P3GlastHeimNpcNameTable,
	...P3ClassicDungeonNpcNameTable,
	...P3TurtleIslandNpcNameTable,
	...P3RegionalDungeonNpcNameTable,
	...P3MidgameDungeonNpcNameTable,
	...P3RemainingCommonNpcNameTable
};

for (const [source, translated] of Object.entries(NpcNameTable)) {
	if (!/^[\u0020-\u007e]+$/.test(source) || source.length <= PACKET_NAME_VISIBLE_LENGTH) {
		continue;
	}

	const packetName = source.slice(0, PACKET_NAME_VISIBLE_LENGTH);
	if (NpcNameTable[packetName] && NpcNameTable[packetName] !== translated) {
		throw new Error(`Conflicting truncated NPC name: ${packetName}`);
	}
	NpcNameTable[packetName] = translated;
}

export default NpcNameTable;
