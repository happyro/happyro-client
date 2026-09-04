const FIRST_ADVENTURE_ACHIEVEMENT_ID = 120001;

const ADVENTURE_ACHIEVEMENT_MAPS = [
	'prt_fild01.rsw',
	'prt_fild02.rsw',
	'prt_fild03.rsw',
	'prt_fild04.rsw',
	'prt_fild05.rsw',
	'prt_fild06.rsw',
	'prt_fild07.rsw',
	'prt_fild08.rsw',
	'prt_fild09.rsw',
	'prt_fild10.rsw',
	'gef_fild00.rsw',
	'gef_fild01.rsw',
	'gef_fild05.rsw',
	'gef_fild06.rsw',
	'gef_fild07.rsw',
	'gef_fild09.rsw',
	'gef_fild11.rsw',
	'moc_fild11.rsw',
	'moc_fild12.rsw',
	'moc_fild13.rsw',
	'moc_fild16.rsw',
	'moc_fild17.rsw',
	'moc_fild18.rsw',
	'pay_fild01.rsw',
	'pay_fild02.rsw',
	'pay_fild03.rsw',
	'pay_fild04.rsw',
	'pay_fild07.rsw',
	'pay_fild08.rsw',
	'pay_fild09.rsw',
	'pay_fild10.rsw',
	'mjolnir_01.rsw',
	'mjolnir_02.rsw',
	'mjolnir_03.rsw',
	'mjolnir_04.rsw',
	'mjolnir_05.rsw',
	'mjolnir_06.rsw',
	'mjolnir_07.rsw',
	'mjolnir_08.rsw',
	'mjolnir_09.rsw',
	'mjolnir_10.rsw',
	'mjolnir_11.rsw',
	'mjolnir_12.rsw',
	'cmd_fild01.rsw',
	'cmd_fild02.rsw',
	'cmd_fild03.rsw',
	'cmd_fild04.rsw',
	'cmd_fild06.rsw',
	'cmd_fild07.rsw',
	'cmd_fild08.rsw',
	'cmd_fild09.rsw',
	'yuno_fild01.rsw',
	'yuno_fild12.rsw',
	'yuno_fild02.rsw',
	'yuno_fild03.rsw',
	'yuno_fild04.rsw',
	'yuno_fild06.rsw',
	'yuno_fild07.rsw',
	'yuno_fild08.rsw',
	'yuno_fild09.rsw',
	'yuno_fild11.rsw',
	'hu_fild01.rsw',
	'hu_fild02.rsw',
	'hu_fild04.rsw',
	'hu_fild06.rsw',
	'hu_fild05.rsw',
	'ein_fild01.rsw',
	'ein_fild03.rsw',
	'ein_fild04.rsw',
	'ein_fild05.rsw',
	'ein_fild06.rsw',
	'ein_fild07.rsw',
	'ein_fild08.rsw',
	'ein_fild09.rsw',
	'lhz_fild01.rsw',
	'lhz_fild02.rsw',
	'lhz_fild03.rsw',
	'ra_fild01.rsw',
	'ra_fild03.rsw',
	'ra_fild08.rsw',
	'ra_fild12.rsw',
	'ra_fild04.rsw',
	'ra_fild05.rsw',
	'ra_fild06.rsw',
	've_fild01.rsw',
	've_fild02.rsw',
	've_fild03.rsw',
	've_fild04.rsw',
	've_fild07.rsw',
	'ecl_fild01.rsw',
	'bif_fild01.rsw',
	'bif_fild02.rsw',
	'spl_fild01.rsw',
	'spl_fild02.rsw',
	'spl_fild03.rsw',
	'man_fild01.rsw',
	'man_fild02.rsw',
	'man_fild03.rsw',
	'dic_fild01.rsw',
	'dic_fild02.rsw',
	'ama_fild01.rsw',
	'gon_fild01.rsw',
	'lou_fild01.rsw',
	'ayo_fild01.rsw',
	'mosk_fild02.rsw',
	'bra_fild01.rsw',
	'dew_fild01.rsw',
	'ma_fild01.rsw',
	'ma_fild02.rsw',
	'abbey03.rsw',
	'abyss_03.rsw',
	'c_tower4.rsw',
	'ama_dun03.rsw',
	'anthell02.rsw',
	'ayo_dun02.rsw',
	'beach_dun3.rsw',
	'bra_dun02.rsw',
	'alde_dun04.rsw',
	'dew_dun02.rsw',
	'dic_dun03.rsw',
	'ecl_tdun04.rsw',
	'ein_dun02.rsw',
	'gef_dun02.rsw',
	'gl_cas02.rsw',
	'gl_sew04.rsw',
	'gl_knt02.rsw',
	'gl_prison1.rsw',
	'gon_dun03.rsw',
	'ice_dun03.rsw',
	'in_sphinx5.rsw',
	'prt_sewb4.rsw',
	'kh_dun02.rsw',
	'lhz_dun03.rsw',
	'lou_dun03.rsw',
	'mag_dun02.rsw',
	'mjo_dun03.rsw',
	'moc_pryd06.rsw',
	'orcsdun02.rsw',
	'pay_dun04.rsw',
	'prt_maze03.rsw',
	'iz_dun05.rsw',
	'tha_t06.rsw',
	'thor_v03.rsw',
	'treasure02.rsw',
	'tur_dun04.rsw',
	'xmas_dun02.rsw'
];

function getAdventureMapNames(mapInfo) {
	const names = ADVENTURE_ACHIEVEMENT_MAPS.map(map => mapInfo[map]?.displayName || map.replace(/\.rsw$/, ''));
	const totals = names.reduce((counts, name) => counts.set(name, (counts.get(name) || 0) + 1), new Map());
	const occurrences = new Map();

	return names.map(name => {
		if (totals.get(name) === 1) return name;

		const occurrence = (occurrences.get(name) || 0) + 1;
		occurrences.set(name, occurrence);
		return `${name}（${occurrence}）`;
	});
}

export function localizeAdventureAchievementMaps(achievementTable, mapInfo) {
	const mapNames = getAdventureMapNames(mapInfo);

	mapNames.forEach((mapName, index) => {
		const achievement = achievementTable[FIRST_ADVENTURE_ACHIEVEMENT_ID + index];
		if (!achievement) return;

		achievement.title = `探索${mapName}`;
		achievement.content = achievement.content || {};
		achievement.content.summary = `发现${mapName}的宝藏`;
		achievement.content.details = `发现${mapName}的宝藏`;

		if (achievement.resource) {
			Object.values(achievement.resource).forEach(resource => {
				resource.text = `发现${mapName}的宝藏`;
			});
		}
	});

	Object.values(achievementTable).forEach(achievement => {
		if (!achievement?.resource) return;

		Object.values(achievement.resource).forEach(resource => {
			if (
				resource.shortcut < FIRST_ADVENTURE_ACHIEVEMENT_ID ||
				resource.shortcut >= FIRST_ADVENTURE_ACHIEVEMENT_ID + ADVENTURE_ACHIEVEMENT_MAPS.length
			)
				return;

			const dependent = achievementTable[resource.shortcut];
			if (dependent?.title) resource.text = `完成${dependent.title}`;
		});
	});
}

export { ADVENTURE_ACHIEVEMENT_MAPS };
