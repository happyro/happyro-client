import DB from 'DB/DBManager.js';

// Keep overhead labels, combat messages and target panels on the same name.
export function localizeEntityName(entity, serverName = entity.display.name) {
	const type = entity.constructor;
	let name;
	let style;
	if ([type.TYPE_MOB, type.TYPE_NPC_ABR, type.TYPE_NPC_BIONIC].includes(entity.objecttype)) {
		name = DB.getMonsterName(entity._job);
		if (name === '未知') return false;
		style = entity.display.STYLE.MOB;
	} else if ([type.TYPE_NPC, type.TYPE_NPC2].includes(entity.objecttype)) {
		name = DB.getNpcName(serverName);
		style = entity.display.STYLE.NPC;
	} else {
		return false;
	}
	entity.display.name = name;
	entity.display.fakename = '';
	entity.display.update(style);
	return true;
}
